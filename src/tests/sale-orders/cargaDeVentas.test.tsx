import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";

/**
 * Mientras cargan las ventas, los filtros ya ocupan su sitio. Antes salían al llegar los datos
 * —su condición era «hay órdenes»— y, en móvil, sus cinco campos apilados empujaban la lista
 * hacia abajo: un CLS de 0.18 medido, el peor de la aplicación.
 */
let cargando = true;

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => (cargando
        ? { data: undefined, isLoading: true }
        : { data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }, isLoading: false }),
    useCreateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useShipSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

describe("SaleOrdersPage — la carga", () => {
    it("mientras carga, enseña el esqueleto con los filtros ya en su sitio", () => {
        cargando = true;
        renderWithProviders(<SaleOrdersPage />);

        expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
        expect(screen.getByRole("textbox", { name: "Nº de venta" })).toBeInTheDocument();
    });

    it("sin ninguna venta y sin filtros, los filtros no salen: no hay nada que filtrar", () => {
        cargando = false;
        renderWithProviders(<SaleOrdersPage />);

        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(screen.queryByRole("textbox", { name: "Nº de venta" })).not.toBeInTheDocument();
    });
});
