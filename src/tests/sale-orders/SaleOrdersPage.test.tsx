import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import type { SaleOrder, SaleOrderItem, SaleOrderStatus, UpdateSaleOrderDto } from "@/modules/sale-orders/types/sale-orders.types";

// T2-42: la reposición de stock de T0-03 vive en el backend desde el 2026-08-04, pero
// la interfaz solo ofrecía cancelar mientras la orden estaba PENDIENTE, así que no había
// forma de alcanzarla desde la aplicación. Lo que se comprueba aquí es el camino entero:
// que la acción existe en una orden enviada, que pide confirmación antes de mover
// inventario, y que lo que envía al servidor es la transición correcta.

const ORDEN_ID = "aaaaaaaa-1111-2222-3333-444444444444";

/**
 * T4-01 — un ítem con todos los campos que el backend envía de verdad. Antes los mocks
 * traían cinco de los ocho y el tipo lo permitía; `unitPrice` va como cadena porque es
 * `Decimal` en Prisma, y `product` acompaña a `productId`: los dos en null es un ítem
 * suelto, que es lo que la reposición de T2-42 excluye.
 */
const item = (over: Partial<SaleOrderItem> & { id: string }): SaleOrderItem => ({
    saleOrderId: ORDEN_ID,
    productId: null,
    product: null,
    productName: "Artículo",
    quantity: 1,
    unitPrice: "10.00",
    createdAt: "2026-08-08T10:00:00.000Z",
    ...over,
});

const ORDEN_ENVIADA: SaleOrder = {
    id: ORDEN_ID,
    status: "SHIPPED",
    customerName: "Cliente de prueba",
    customerEmail: null,
    customerPhone: null,
    notes: null,
    items: [
        item({ id: "i1", productId: "p1", product: { id: "p1", name: "Teclado", sku: null }, productName: "Teclado", quantity: 3, unitPrice: "50.00" }),
        item({ id: "i2", productId: "p2", product: { id: "p2", name: "Ratón", sku: null }, productName: "Ratón", quantity: 2, unitPrice: "25.00" }),
    ],
    createdAt: "2026-08-08T10:00:00.000Z",
    updatedAt: "2026-08-08T10:00:00.000Z",
};

const ORDEN_PENDIENTE: SaleOrder = {
    ...ORDEN_ENVIADA,
    id: "bbbbbbbb-1111-2222-3333-444444444444",
    status: "PENDING",
};

const mutaciones: Array<{ id: string; dto: UpdateSaleOrderDto }> = [];
let ordenes: SaleOrder[] = [];
let rol: "ADMIN" | "USER" = "ADMIN";

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => ({ data: { data: ordenes }, isLoading: false }),
    useCreateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSaleOrder: () => ({
        // Se comporta como la mutación real en el caso feliz: invoca `onSuccess`, que
        // es lo que cierra el diálogo.
        mutate: (
            vars: { id: string; dto: UpdateSaleOrderDto },
            opciones?: { onSuccess?: () => void },
        ) => {
            mutaciones.push(vars);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: rol } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

/** La acción de cancelar de una orden enviada, por su nombre accesible. */
function botonCancelarEnvio(orden: SaleOrder = ORDEN_ENVIADA) {
    return screen.queryByRole("button", {
        name: `Cancelar la orden enviada Venta #${orden.id.slice(0, 8).toUpperCase()}`,
    });
}

describe("SaleOrdersPage — cancelar una orden ya enviada (T2-42)", () => {
    beforeEach(() => {
        mutaciones.length = 0;
        ordenes = [ORDEN_ENVIADA];
        rol = "ADMIN";
    });

    it("ofrece cancelar una orden enviada, pero no eliminarla", () => {
        renderWithProviders(<SaleOrdersPage />);

        expect(botonCancelarEnvio()).toBeInTheDocument();
        // El backend rechaza borrar una orden enviada, así que la acción no se ofrece.
        expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    });

    it("no cancela al primer clic: abre un diálogo con las unidades que se repondrán", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);

        await user.click(botonCancelarEnvio()!);

        const dialogo = screen.getByRole("dialog");
        // 3 + 2 unidades de los dos ítems ligados a un producto.
        expect(within(dialogo).getByText(/Se repondrán/)).toHaveTextContent("Se repondrán 5 unidades");
        expect(within(dialogo).getByText("Teclado")).toBeInTheDocument();
        expect(within(dialogo).getByText("+3")).toBeInTheDocument();
        // Lo importante: hasta aquí no se ha tocado el inventario.
        expect(mutaciones).toHaveLength(0);
    });

    it("confirmar envía la transición a CANCELLED y cierra el diálogo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);

        await user.click(botonCancelarEnvio()!);
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar la orden" }));

        expect(mutaciones).toEqual([{ id: ORDEN_ENVIADA.id, dto: { status: "CANCELLED" } }]);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("«Volver» cierra el diálogo sin cancelar nada", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);

        await user.click(botonCancelarEnvio()!);
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mutaciones).toHaveLength(0);
    });

    it("los ítems sin producto del catálogo no se cuentan como reposición", async () => {
        ordenes = [{
            ...ORDEN_ENVIADA,
            items: [item({ id: "i3", productName: "Servicio de instalación", quantity: 4, unitPrice: "100.00" })],
        }];
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);

        await user.click(botonCancelarEnvio()!);

        // El backend repone solo `productId != null`; prometer 4 unidades sería mentir.
        const dialogo = screen.getByRole("dialog");
        expect(within(dialogo).queryByText(/Se repondrán/)).not.toBeInTheDocument();
        expect(within(dialogo).getByText(/el inventario no cambiará/)).toBeInTheDocument();
    });

    it("un usuario sin rol ADMIN no ve la acción", () => {
        rol = "USER";
        renderWithProviders(<SaleOrdersPage />);

        expect(botonCancelarEnvio()).not.toBeInTheDocument();
    });

    it("una orden pendiente se sigue cancelando sin diálogo", async () => {
        ordenes = [ORDEN_PENDIENTE];
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);

        // El nombre lleva el número de la orden: tres botones de icono por fila se
        // anunciaban todos igual, y el E2E llegó a operar sobre la orden equivocada.
        await user.click(screen.getByRole("button", { name: /^Cancelar la Venta #/ }));

        // Cancelar una orden pendiente no mueve inventario, así que no hay nada que
        // confirmar: la diferencia de trato entre los dos estados es deliberada.
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mutaciones).toEqual([{ id: ORDEN_PENDIENTE.id, dto: { status: "CANCELLED" } }]);
    });

    it("una orden cancelada no ofrece ninguna acción", () => {
        ordenes = [{ ...ORDEN_ENVIADA, status: "CANCELLED" as SaleOrderStatus }];
        renderWithProviders(<SaleOrdersPage />);

        expect(botonCancelarEnvio()).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^Cancelar la Venta #/ })).not.toBeInTheDocument();
    });
});
