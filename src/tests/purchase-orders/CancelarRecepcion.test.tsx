import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import PurchaseOrdersPage from "@/modules/purchase-orders/components/PurchaseOrdersPage";
import type { PurchaseOrder } from "@/modules/purchase-orders/types/purchase-orders.types";

/**
 * T5-01 — cancelar por interfaz una orden de compra ya recibida.
 *
 * El backend lo permite desde T0-04 y retira el stock que entró; la interfaz solo ofrecía
 * cancelar las pendientes. Es la misma carencia que T2-42 cerró en ventas, y los tests siguen
 * su patrón: lo que se confirma es el **movimiento de stock**, así que el primer clic no toca
 * nada y el diálogo dice cuánto sale y de qué productos.
 */

const ORDEN_RECIBIDA = {
    id: "bbbbbbbb-1111-2222-3333-444444444444",
    supplierId: null,
    supplier: null,
    status: "RECEIVED",
    notes: null,
    items: [
        { id: "i1", purchaseOrderId: "x", productId: "prod-1", product: null, productName: "Teclado", quantity: 3, unitPrice: "450", createdAt: "" },
        { id: "i2", purchaseOrderId: "x", productId: "prod-2", product: null, productName: "Monitor", quantity: 2, unitPrice: "3200", createdAt: "" },
        { id: "i3", purchaseOrderId: "x", productId: null, product: null, productName: "Ítem escrito a mano", quantity: 9, unitPrice: "10", createdAt: "" },
    ],
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
} satisfies PurchaseOrder;

let ordenes: PurchaseOrder[] = [];
let rol: "ADMIN" | "USER" = "ADMIN";
const mutaciones: unknown[] = [];
/** Si es `false`, la mutación simula el 400 del backend: no llama a `onSuccess`. */
let exito = true;

vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    usePurchaseOrders: () => ({
        data: { data: ordenes, meta: { total: ordenes.length, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
    }),
    useCreatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdatePurchaseOrder: () => ({
        mutate: (vars: unknown, opciones?: { onSuccess?: () => void }) => {
            mutaciones.push(vars);
            if (exito) opciones?.onSuccess?.();
        },
        isPending: false,
    }),
    useDeletePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: rol } }),
}));

vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({
    useSuppliers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

function botonCancelarRecepcion() {
    return screen.queryByRole("button", { name: "Cancelar la orden recibida #BBBBBBBB" });
}

describe("PurchaseOrdersPage — cancelar una orden ya recibida (T5-01)", () => {
    beforeEach(() => {
        ordenes = [ORDEN_RECIBIDA];
        rol = "ADMIN";
        exito = true;
        mutaciones.length = 0;
    });

    it("ofrece cancelar una orden recibida, con nombre accesible que dice cuál", () => {
        renderWithProviders(<PurchaseOrdersPage />);

        expect(botonCancelarRecepcion()).toBeInTheDocument();
    });

    it("no cancela al primer clic: abre un diálogo con las unidades que saldrán", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(botonCancelarRecepcion()!);

        const dialogo = screen.getByRole("dialog");
        // Sin «La orden Orden #…»: la frase ya nombra la orden (visto en el navegador).
        expect(within(dialogo).getByText(/ya fue recibida/)).toHaveTextContent(/^La orden #BBBBBBBB ya fue recibida/);
        // 3 + 2 de los ítems ligados a un producto; los 9 escritos a mano no mueven stock.
        expect(within(dialogo).getByText(/Se retirarán/)).toHaveTextContent("Se retirarán 5 unidades");
        expect(within(dialogo).getByText("Teclado")).toBeInTheDocument();
        expect(within(dialogo).getByText("−3")).toBeInTheDocument();
        expect(within(dialogo).queryByText("Ítem escrito a mano")).not.toBeInTheDocument();
        expect(mutaciones).toHaveLength(0);
    });

    it("avisa de que el coste medio no cambia y de que puede rechazarse", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(botonCancelarRecepcion()!);

        const dialogo = screen.getByRole("dialog");
        expect(within(dialogo).getByText(/El coste medio de los productos no cambia/)).toBeInTheDocument();
        expect(within(dialogo).getByText(/la cancelación se rechaza entera/)).toBeInTheDocument();
    });

    it("confirmar envía la transición a CANCELLED y cierra el diálogo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(botonCancelarRecepcion()!);
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar la orden" }));

        expect(mutaciones).toEqual([{ id: ORDEN_RECIBIDA.id, dto: { status: "CANCELLED" } }]);
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("si el backend la rechaza, el diálogo sigue abierto", async () => {
        exito = false;
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(botonCancelarRecepcion()!);
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar la orden" }));

        // El aviso con el motivo lo pone el `onError` del hook; aquí basta con que el
        // diálogo no desaparezca como si hubiera salido bien.
        expect(mutaciones).toHaveLength(1);
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("«Volver» cierra el diálogo sin cancelar nada", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(botonCancelarRecepcion()!);
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Volver" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(mutaciones).toHaveLength(0);
    });

    it("una orden solo con ítems escritos a mano dice que el inventario no cambia", async () => {
        ordenes = [{ ...ORDEN_RECIBIDA, items: [ORDEN_RECIBIDA.items[2]] }];
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(botonCancelarRecepcion()!);

        const dialogo = screen.getByRole("dialog");
        expect(within(dialogo).getByText(/el inventario no cambiará/)).toBeInTheDocument();
        expect(within(dialogo).queryByText(/Se retirar/)).not.toBeInTheDocument();
        expect(within(dialogo).queryByText(/coste medio/)).not.toBeInTheDocument();
    });

    it("un usuario sin rol ADMIN no ve la acción", () => {
        rol = "USER";
        renderWithProviders(<PurchaseOrdersPage />);

        expect(botonCancelarRecepcion()).not.toBeInTheDocument();
    });
});
