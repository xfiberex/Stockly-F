import { act, screen } from "@testing-library/react";
import { renderWithProviders } from "../utils";
import ProductsPage from "@/modules/products/components/ProductsPage";
import { getWarehouses } from "@/modules/warehouses/api/warehouses.api";

/**
 * Lo que hace que la carga de Productos no salte (CLS medido: 0.05 antes, 0.37 con el esqueleto a
 * secas, 0.019 con esto):
 * - la tabla **espera** a que la barra de filtros tenga su altura final: el filtro de etiquetas
 *   solo sale si hay alguna, y al salir la barra crece una fila;
 * - la leyenda ABC ocupa su sitio, invisible, mientras su consulta carga.
 */

let soltarEtiquetas: (valor: unknown[]) => void = () => {};
vi.mock("@/modules/tags/api/tags.api", () => ({
    getTags: () => new Promise((resolver) => (soltarEtiquetas = resolver)),
}));

let abc: { data?: { from: string; to: string; counts: { A: number; B: number; C: number } }; isLoading: boolean } = { isLoading: true };
vi.mock("@/modules/reports/hooks/useReports", () => ({ useAbcSummary: () => abc }));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }, isLoading: false }),
}));
vi.mock("@/modules/products/hooks/useImportProducts", () => ({ useImportProducts: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/modules/products/hooks/useDeleteProduct", () => ({ useDeleteProduct: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/modules/products/hooks/useRestoreProduct", () => ({ useRestoreProduct: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", email: "a@b.c", role: "ADMIN" }, isLoading: false, isError: false }),
}));

describe("ProductsPage — la carga", () => {
    beforeEach(() => {
        abc = { isLoading: true };
    });

    it("mientras no se sabe si hay etiquetas, anuncia la carga pero no pinta el esqueleto; después, la página", async () => {
        renderWithProviders(<ProductsPage />);
        // Los almacenes (doble de `setup.ts`) llegan en el siguiente tick: se dejan llegar para que
        // lo único pendiente sean las etiquetas, que es lo que se prueba.
        await act(() => new Promise((r) => setTimeout(r, 0)));

        const zona = screen.getByRole("status");
        expect(zona).toHaveTextContent("Cargando…");
        // Sin formas: el esqueleto no se pinta para no quedar debajo de una barra que va a crecer.
        expect(zona.querySelector(".esqueleto-pulso")).toBeNull();

        await act(async () => soltarEtiquetas([]));
        expect(await screen.findByText(/No se encontraron productos/)).toBeInTheDocument();
    });

    it("y mientras no se sabe cuántos almacenes hay, tampoco: su filtro solo sale con dos o más", async () => {
        vi.mocked(getWarehouses).mockReturnValueOnce(new Promise(() => {}));
        renderWithProviders(<ProductsPage />);
        await act(async () => soltarEtiquetas([]));
        // Un tick real: TanStack avisa del cambio en el siguiente, y un «no está» antes no prueba nada.
        await act(() => new Promise((r) => setTimeout(r, 20)));

        const zona = screen.getByRole("status");
        expect(zona.querySelector(".esqueleto-pulso")).toBeNull();
        expect(screen.queryByText(/No se encontraron productos/)).not.toBeInTheDocument();
    });

    it("la leyenda ABC ocupa su sitio mientras carga, invisible y oculta al lector", () => {
        const { container } = renderWithProviders(<ProductsPage />);

        const leyenda = [...container.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Clases ABC"));
        expect(leyenda).toBeDefined();
        expect(leyenda).toHaveClass("invisible");
        expect(leyenda).toHaveAttribute("aria-hidden", "true");
    });

    it("con la consulta ABC resuelta, la leyenda se ve con sus fechas", () => {
        abc = { data: { from: "2025-09-01", to: "2026-08-31", counts: { A: 1, B: 0, C: 0 } }, isLoading: false };
        const { container } = renderWithProviders(<ProductsPage />);

        const leyenda = [...container.querySelectorAll("p")].find((p) => p.textContent?.startsWith("Clases ABC"))!;
        expect(leyenda).not.toHaveClass("invisible");
        expect(leyenda).not.toHaveAttribute("aria-hidden");
        expect(leyenda.textContent).toContain("2025");
    });

    it("sin datos ABC y sin cargar, no hay leyenda", () => {
        abc = { isLoading: false };
        const { container } = renderWithProviders(<ProductsPage />);
        expect([...container.querySelectorAll("p")].some((p) => p.textContent?.startsWith("Clases ABC"))).toBe(false);
    });
});
