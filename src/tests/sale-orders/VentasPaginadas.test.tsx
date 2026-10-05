import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import type { SaleOrdersQuery } from "@/modules/sale-orders/api/sale-orders.api";
import type { SaleOrder, SaleOrderStatus } from "@/modules/sale-orders/types/sale-orders.types";

/**
 * T6-01 — la pantalla de ventas solo enseñaba las diez órdenes más recientes.
 *
 * Aquí se simula **la API y no el hook**, al revés que en los otros dos archivos de esta
 * carpeta: lo que se comprueba es qué se le pide al servidor —la página, el estado, el rango— y
 * que un rango al revés no se le pide. Con el hook simulado no habría nada que mirar.
 */

const orden = (n: number, status: SaleOrderStatus): SaleOrder => ({
    id: `${String(n).padStart(8, "0")}-1111-2222-3333-444444444444`,
    status,
    customerId: null,
    customerName: `Cliente ${n}`,
    customerEmail: null,
    customerPhone: null,
    notes: null,
    items: [],
    createdAt: "2026-03-05T15:00:00.000Z",
    updatedAt: "2026-03-05T15:00:00.000Z",
});

/** Veinticinco, de la más reciente (25) a la más antigua (1); las siete primeras, enviadas. */
const TODAS = Array.from({ length: 25 }, (_, i) => orden(25 - i, i < 7 ? "SHIPPED" : "PENDING"));

let existentes: SaleOrder[] = TODAS;
const pedidas: SaleOrdersQuery[] = [];

vi.mock("@/modules/sale-orders/api/sale-orders.api", () => ({
    getSaleOrders: async (query: SaleOrdersQuery) => {
        pedidas.push(query);
        const { page = 1, limit = 10 } = query;
        // El rango no se evalúa: dónde empieza un día lo decide el servidor, y eso se prueba allí.
        const filtradas = existentes.filter((o) => !query.status || o.status === query.status);
        return {
            data: filtradas.slice((page - 1) * limit, page * limit),
            meta: { total: filtradas.length, page, limit, totalPages: Math.ceil(filtradas.length / limit) },
        };
    },
    exportSaleOrdersCsv: vi.fn(),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

const ultimaPedida = () => pedidas.at(-1)!;

/** La fila lleva el nombre y la fecha en el mismo párrafo; el «·» evita que el 1 case con el 10. */
const cliente = (n: number) => new RegExp(`Cliente ${n} ·`);

async function abrir() {
    const user = userEvent.setup();
    renderWithProviders(<SaleOrdersPage />);
    await screen.findByText(cliente(25));
    return user;
}

describe("SaleOrdersPage — paginación y filtros (T6-01)", () => {
    beforeEach(() => {
        existentes = TODAS;
        pedidas.length = 0;
    });

    it("con 25 órdenes el encabezado dice 25, no las diez de la página", async () => {
        await abrir();

        expect(screen.getByText("25 órdenes")).toBeInTheDocument();
        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
        expect(ultimaPedida()).toMatchObject({ page: 1, limit: 10 });
    });

    it("se llega a la más antigua pasando de página", async () => {
        const user = await abrir();
        expect(screen.queryByText(cliente(1))).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Siguiente" }));
        await screen.findByText("Página 2 de 3");
        await user.click(screen.getByRole("button", { name: "Siguiente" }));

        expect(await screen.findByText(cliente(1))).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
        expect(ultimaPedida()).toMatchObject({ page: 3 });
    });

    it("filtrar por estado vuelve a la página 1 y cuenta lo filtrado", async () => {
        const user = await abrir();
        await user.click(screen.getByRole("button", { name: "Siguiente" }));
        await screen.findByText("Página 2 de 3");

        await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "Enviado");

        expect(await screen.findByText("7 órdenes")).toBeInTheDocument();
        expect(ultimaPedida()).toMatchObject({ page: 1, status: "SHIPPED" });
        // Siete caben en una página: la paginación desaparece.
        expect(screen.queryByText(/^Página/)).not.toBeInTheDocument();
    });

    it("el rango de fechas se envía tal cual, como días, y vuelve a la página 1", async () => {
        const user = await abrir();
        await user.click(screen.getByRole("button", { name: "Siguiente" }));
        await screen.findByText("Página 2 de 3");

        fireEvent.change(screen.getByLabelText("Creada desde"), { target: { value: "2026-03-01" } });
        fireEvent.change(screen.getByLabelText("Creada hasta"), { target: { value: "2026-03-05" } });

        await waitFor(() => expect(ultimaPedida()).toMatchObject({ page: 1, from: "2026-03-01", to: "2026-03-05" }));
    });

    it("un rango al revés no se pide: se dice en el campo y la lista se queda", async () => {
        await abrir();

        fireEvent.change(screen.getByLabelText("Creada desde"), { target: { value: "2026-03-06" } });
        await waitFor(() => expect(ultimaPedida()).toMatchObject({ from: "2026-03-06" }));
        const antes = pedidas.length;
        fireEvent.change(screen.getByLabelText("Creada hasta"), { target: { value: "2026-03-05" } });

        expect(await screen.findByRole("alert")).toHaveTextContent("La fecha final no puede ser anterior a la inicial");
        expect(screen.getByText(cliente(25))).toBeInTheDocument();
        expect(pedidas).toHaveLength(antes);
    });

    it("sin resultados no dice «crea la primera», y los filtros siguen ahí para deshacerlo", async () => {
        const user = await abrir();
        await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "Cancelado");

        expect(await screen.findByText("Ninguna orden de venta coincide con los filtros.")).toBeInTheDocument();
        expect(screen.getByText("0 órdenes")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));

        expect(await screen.findByText("25 órdenes")).toBeInTheDocument();
        expect(ultimaPedida()).toMatchObject({ page: 1, status: undefined, from: undefined, to: undefined });
        expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
    });

    it("sin ninguna orden no hay filtros que enseñar", async () => {
        existentes = [];
        renderWithProviders(<SaleOrdersPage />);

        expect(await screen.findByText("No hay órdenes de venta. Crea la primera.")).toBeInTheDocument();
        expect(screen.queryByRole("combobox", { name: "Estado" })).not.toBeInTheDocument();
    });
});
