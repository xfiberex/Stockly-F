import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import type { SaleOrder, SaleOrderItem } from "@/modules/sale-orders/types/sale-orders.types";

/**
 * T6-05 — impuesto en la venta.
 *
 * La regla que se vigila es una: **la interfaz no suma**. Los importes de los mocks son
 * incoherentes a propósito —tres unidades a 1,00 con un subtotal de 300,00—: si la pantalla
 * volviera a multiplicar cantidad por precio, saldría 3,00 y el test lo vería.
 */

const linea = (id: string, taxRate: number | null, subtotal: string, tax: string): SaleOrderItem => ({
    id,
    saleOrderId: "o1",
    productId: null,
    product: null,
    productName: `Artículo ${id}`,
    quantity: 3,
    unitPrice: "1.00",
    taxRate,
    subtotal,
    tax,
    total: (Number(subtotal) + Number(tax)).toFixed(2),
    createdAt: "2026-10-08T10:00:00.000Z",
});

const orden = (items: SaleOrderItem[], importes: Pick<SaleOrder, "subtotal" | "tax" | "total">): SaleOrder => ({
    id: "o1",
    number: 41,
    status: "PENDING",
    customerId: null,
    customerName: "Cliente",
    customerEmail: null,
    customerPhone: null,
    notes: null,
    items,
    ...importes,
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T10:00:00.000Z",
});

const CON_IMPUESTO = orden([linea("a", 18, "300.00", "54.00")], { subtotal: "300.00", tax: "54.00", total: "354.00" });

let ordenes: SaleOrder[] = [];
let taxName = "ITBIS";

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => ({
        data: { data: ordenes, meta: { total: ordenes.length, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
    }),
    useCreateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useShipSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/settings/hooks/useNegocio", () => ({
    useNegocio: () => ({ data: { taxName } }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

/** Despliega la orden y devuelve las filas del pie de su tabla, como `[rótulo, importe]`. */
async function pie() {
    const user = userEvent.setup();
    renderWithProviders(<SaleOrdersPage />);
    await user.click(screen.getByText("Venta #000041"));

    const filas = within(screen.getByRole("table")).getAllByRole("row").filter((fila) => fila.closest("tfoot"));
    return filas.map((fila) => within(fila).getAllByRole("cell").map((celda) => celda.textContent));
}

describe("SaleOrdersPage — impuesto en la venta (T6-05)", () => {
    beforeEach(() => {
        ordenes = [CON_IMPUESTO];
        taxName = "ITBIS";
    });

    it("la fila de la lista enseña el total que manda el servidor, con impuesto", () => {
        renderWithProviders(<SaleOrdersPage />);

        expect(screen.getByText("$354.00")).toBeInTheDocument();
        // Tres unidades a 1,00: lo que saldría si la pantalla siguiera sumando.
        expect(screen.queryByText("$3.00")).not.toBeInTheDocument();
    });

    it("con impuesto, el pie trae subtotal, impuesto con su nombre y su tasa, y total", async () => {
        expect(await pie()).toEqual([
            ["Subtotal", "$300.00"],
            ["ITBIS (18 %)", "$54.00"],
            ["Total", "$354.00"],
        ]);
    });

    it("el importe de cada línea también es el del servidor, sin impuesto", async () => {
        await pie();

        const fila = screen.getByRole("row", { name: /Artículo a/ });
        expect(within(fila).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Artículo a", "3", "$1.00", "$300.00"]);
    });

    it("sin nombre en Configuración, el impuesto se llama con el genérico", async () => {
        taxName = "";

        expect((await pie())[1]).toEqual(["Impuesto (18 %)", "$54.00"]);
    });

    it("con la tasa a 0 el pie es el de siempre: solo el total", async () => {
        ordenes = [orden([linea("a", 0, "300.00", "0.00")], { subtotal: "300.00", tax: "0.00", total: "300.00" })];

        expect(await pie()).toEqual([["Total", "$300.00"]]);
        expect(screen.queryByText(/ITBIS/)).not.toBeInTheDocument();
    });

    it("una orden anterior, con sus líneas sin tasa, tampoco enseña impuesto", async () => {
        ordenes = [orden([linea("a", null, "300.00", "0.00")], { subtotal: "300.00", tax: "0.00", total: "300.00" })];

        expect(await pie()).toEqual([["Total", "$300.00"]]);
    });

    it("la tasa se dice aunque haya líneas sin impuesto, si las que lo llevan comparten una", async () => {
        ordenes = [orden(
            [linea("a", 18, "300.00", "54.00"), linea("b", null, "100.00", "0.00")],
            { subtotal: "400.00", tax: "54.00", total: "454.00" },
        )];

        expect((await pie())[1]).toEqual(["ITBIS (18 %)", "$54.00"]);
    });

    it("con dos tasas distintas no se inventa una: solo el nombre", async () => {
        ordenes = [orden(
            [linea("a", 18, "300.00", "54.00"), linea("b", 10, "100.00", "10.00")],
            { subtotal: "400.00", tax: "64.00", total: "464.00" },
        )];

        expect((await pie())[1]).toEqual(["ITBIS", "$64.00"]);
    });
});
