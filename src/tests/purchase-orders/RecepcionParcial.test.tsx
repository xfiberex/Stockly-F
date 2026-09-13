import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import PurchaseOrdersPage from "@/modules/purchase-orders/components/PurchaseOrdersPage";
import type { PurchaseOrder } from "@/modules/purchase-orders/types/purchase-orders.types";

/**
 * T5-04 — registrar entregas parciales desde la interfaz.
 *
 * Antes, «recibir» sumaba de un clic todo lo pedido. Lo que se prueba es lo que cambia para
 * quien opera: el diálogo propone lo que falta de cada línea, no deja pasarse, manda solo
 * las líneas con algo, y una orden a medias se ve, se sigue recibiendo y al cancelarse dice
 * que retira lo que llegó —no lo pedido—.
 */

const item = (over: Partial<PurchaseOrder["items"][number]>) => ({
    id: "i",
    purchaseOrderId: "x",
    productId: "prod",
    product: null,
    productName: "Producto",
    quantity: 1,
    receivedQuantity: 0,
    unitPrice: "10",
    createdAt: "",
    ...over,
});

/** 100 teclados de los que llegaron 60, 5 ratones completos y unos portes escritos a mano. */
const A_MEDIAS = {
    id: "cccccccc-1111-2222-3333-444444444444",
    supplierId: null,
    supplier: null,
    status: "PARTIALLY_RECEIVED",
    notes: null,
    items: [
        item({ id: "teclado", productId: "p-teclado", productName: "Teclado", quantity: 100, receivedQuantity: 60 }),
        item({ id: "raton", productId: "p-raton", productName: "Ratón", quantity: 5, receivedQuantity: 5 }),
        item({ id: "portes", productId: null, productName: "Portes", quantity: 1, receivedQuantity: 0 }),
    ],
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-09-10T10:00:00.000Z",
} satisfies PurchaseOrder;

let ordenes: PurchaseOrder[] = [];
const recibidas: unknown[] = [];
const actualizadas: unknown[] = [];
/** Si es `false`, la recepción simula el 400 del backend: no llama a `onSuccess`. */
let exito = true;

vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    usePurchaseOrders: () => ({
        data: { data: ordenes, meta: { total: ordenes.length, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
    }),
    useCreatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdatePurchaseOrder: () => ({
        mutate: (vars: unknown, opciones?: { onSuccess?: () => void }) => {
            actualizadas.push(vars);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
    useDeletePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useReceivePurchaseOrder: () => ({
        mutate: (vars: unknown, opciones?: { onSuccess?: () => void }) => {
            recibidas.push(vars);
            if (exito) opciones?.onSuccess?.();
        },
        isPending: false,
    }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({
    useSuppliers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

async function abrirRecepcion() {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseOrdersPage />);
    await user.click(screen.getByRole("button", { name: "Recibir mercancía de la orden #CCCCCCCC" }));
    return { user, dialogo: screen.getByRole("dialog") };
}

const campo = (dialogo: HTMLElement, producto: string) => within(dialogo).getByLabelText(`Llega ahora de ${producto}`);

describe("PurchaseOrdersPage — recepción parcial (T5-04)", () => {
    beforeEach(() => {
        ordenes = [A_MEDIAS];
        recibidas.length = 0;
        actualizadas.length = 0;
        exito = true;
    });

    describe("Una orden a medias en la lista", () => {
        it("se ve como tal, con cuánto llegó, y se puede seguir recibiendo o cancelar, pero no eliminar", () => {
            renderWithProviders(<PurchaseOrdersPage />);

            expect(screen.getByText("Recibida a medias")).toBeInTheDocument();
            expect(screen.getByText("65 de 106 uds. recibidas")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Recibir mercancía de la orden #CCCCCCCC" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Cancelar la orden recibida #CCCCCCCC" })).toBeInTheDocument();
            expect(screen.queryByTitle("Eliminar")).not.toBeInTheDocument();
        });

        it("desplegada, enseña lo recibido de cada línea", async () => {
            const user = userEvent.setup();
            renderWithProviders(<PurchaseOrdersPage />);

            await user.click(screen.getByText(/Orden #/));

            const fila = screen.getByText("Teclado").closest("tr")!;
            expect(screen.getByRole("columnheader", { name: "Recibido" })).toBeInTheDocument();
            expect(within(fila).getByText("60")).toBeInTheDocument();
        });
    });

    describe("El diálogo de recepción", () => {
        it("propone lo que falta de cada línea y marca las completas", async () => {
            const { dialogo } = await abrirRecepcion();

            expect(campo(dialogo, "Teclado")).toHaveValue(40);
            expect(campo(dialogo, "Portes")).toHaveValue(1);
            // El ratón ya llegó entero: no hay nada que escribir.
            expect(within(dialogo).queryByLabelText("Llega ahora de Ratón")).not.toBeInTheDocument();
            expect(within(dialogo).getByText("Completa")).toBeInTheDocument();
            expect(within(dialogo).getByText("Sin producto: no mueve inventario")).toBeInTheDocument();
            // Los portes cuentan para cerrar la orden, pero no suman unidades al inventario.
            expect(within(dialogo).getByText(/Se sumarán 40 unidades al inventario\. La orden quedará recibida\./)).toBeInTheDocument();
        });

        it("confirmar sin tocar nada recibe todo lo que falta", async () => {
            const { user, dialogo } = await abrirRecepcion();

            await user.click(within(dialogo).getByRole("button", { name: "Registrar recepción" }));

            expect(recibidas).toEqual([
                { id: A_MEDIAS.id, dto: { items: [{ itemId: "teclado", quantity: 40 }, { itemId: "portes", quantity: 1 }] } },
            ]);
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("una entrega parcial manda solo las líneas con algo y avisa de que la orden sigue a medias", async () => {
            const { user, dialogo } = await abrirRecepcion();

            await user.clear(campo(dialogo, "Teclado"));
            await user.type(campo(dialogo, "Teclado"), "15");
            await user.clear(campo(dialogo, "Portes"));

            expect(within(dialogo).getByText(/Se sumarán 15 unidades al inventario\. La orden quedará recibida a medias\./)).toBeInTheDocument();

            await user.click(within(dialogo).getByRole("button", { name: "Registrar recepción" }));

            expect(recibidas).toEqual([{ id: A_MEDIAS.id, dto: { items: [{ itemId: "teclado", quantity: 15 }] } }]);
            expect(actualizadas).toHaveLength(0);
        });

        it("pasarse de lo que falta lo dice en el campo y no deja registrar", async () => {
            const { user, dialogo } = await abrirRecepcion();

            await user.clear(campo(dialogo, "Teclado"));
            await user.type(campo(dialogo, "Teclado"), "41");

            expect(within(dialogo).getByText("Solo quedan 40")).toBeInTheDocument();
            const registrar = within(dialogo).getByRole("button", { name: "Registrar recepción" });
            expect(registrar).toBeDisabled();

            await user.click(registrar);
            expect(recibidas).toHaveLength(0);
        });

        it("sin ninguna cantidad no hay entrega que registrar", async () => {
            const { user, dialogo } = await abrirRecepcion();

            await user.clear(campo(dialogo, "Teclado"));
            await user.clear(campo(dialogo, "Portes"));

            expect(within(dialogo).getByText("Indica al menos una cantidad para registrar la entrega.")).toBeInTheDocument();
            expect(within(dialogo).getByRole("button", { name: "Registrar recepción" })).toBeDisabled();
        });

        it("si el backend rechaza la entrega, el diálogo sigue abierto con lo escrito", async () => {
            exito = false;
            const { user, dialogo } = await abrirRecepcion();

            await user.clear(campo(dialogo, "Teclado"));
            await user.type(campo(dialogo, "Teclado"), "7");
            await user.click(within(dialogo).getByRole("button", { name: "Registrar recepción" }));

            expect(recibidas).toHaveLength(1);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(campo(screen.getByRole("dialog"), "Teclado")).toHaveValue(7);
        });
    });

    describe("Cancelar una orden a medias", () => {
        it("retira lo que llegó, no lo pedido, y dice que lo que falta ya no se recibirá", async () => {
            const user = userEvent.setup();
            renderWithProviders(<PurchaseOrdersPage />);

            await user.click(screen.getByRole("button", { name: "Cancelar la orden recibida #CCCCCCCC" }));

            const dialogo = screen.getByRole("dialog");
            expect(within(dialogo).getByText(/está recibida a medias/)).toHaveTextContent(/lo que falta ya no se recibirá/);
            // 60 teclados + 5 ratones. Con lo pedido serían 105.
            expect(within(dialogo).getByText(/Se retirarán/)).toHaveTextContent("Se retirarán 65 unidades");
            expect(within(dialogo).getByText("−60")).toBeInTheDocument();
            expect(within(dialogo).queryByText("−100")).not.toBeInTheDocument();
        });

        it("una línea que no recibió nada no aparece entre lo que se retira", async () => {
            ordenes = [{ ...A_MEDIAS, items: [A_MEDIAS.items[0]!, item({ id: "nada", productId: "p-nada", productName: "Sin llegar", quantity: 8 })] }];
            const user = userEvent.setup();
            renderWithProviders(<PurchaseOrdersPage />);

            await user.click(screen.getByRole("button", { name: "Cancelar la orden recibida #CCCCCCCC" }));

            expect(within(screen.getByRole("dialog")).queryByText("Sin llegar")).not.toBeInTheDocument();
        });
    });
});
