import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import ProductsPage from "@/modules/products/components/ProductsPage";
import type { Rol } from "@/shared/contratos";
import type { Product } from "@/modules/products/types/product.types";

/**
 * T3-09 — el botón flotante tapaba la paginación.
 *
 * **Verificado en navegador antes de arreglarlo**, que es lo que la ficha dejaba
 * pendiente. Y no era «probable que lo solape»: `document.elementFromPoint` en el centro
 * de «Anterior» y «Siguiente», con la página al final del scroll, devolvía el botón
 * flotante. La pulsación no llegaba a la paginación. Medido a 375×667 y también a
 * 1280×800 — la ficha lo daba por un problema de móvil y no lo es, porque lo que junta a
 * los dos elementos no es el ancho sino que ambos viven abajo a la derecha.
 *
 * Lo que estos tests **no** comprueban: la geometría. jsdom no calcula diseño, así que
 * `getBoundingClientRect` devuelve ceros y no hay forma de reproducir aquí el solape. Lo
 * que se fija es la decisión que lo evita —que el hueco aparezca exactamente cuando
 * aparece el botón— para que borrarla ponga algo en rojo.
 */

const mockProductos: Product[] = [
    {
        id: "p1",
        name: "Teclado Logitech",
        description: null,
        sku: "PER-LOG",
        barcode: null,
        price: "100.00",
        costPrice: null,
        stock: 5,
        minStock: 1,
        imageUrl: null,
        imagePublicId: null,
        categoryId: null,
        brandId: null,
        supplierId: null,
        category: null,
        brand: null,
        supplier: null,
        tags: [],
        isActive: true,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
    },
];

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({
        data: { data: mockProductos, meta: { total: 1, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
        isError: false,
    }),
}));
vi.mock("@/modules/reports/hooks/useReports", () => ({
    useAbcSummary: () => ({
        data: { from: "2025-09-01", to: "2026-08-31", timezone: "America/Santo_Domingo", calculatedAt: "2026-09-29T12:00:00Z", counts: { A: 1, B: 0, C: 0 } },
    }),
}));
vi.mock("@/modules/products/hooks/useImportProducts", () => ({
    useImportProducts: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/products/hooks/useDeleteProduct", () => ({ useDeleteProduct: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("@/modules/products/hooks/useRestoreProduct", () => ({ useRestoreProduct: () => ({ mutate: vi.fn(), isPending: false }) }));
let rol: Rol = "ADMIN";
vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", email: "a@b.c", role: rol }, isLoading: false, isError: false }),
}));

/** El contenedor de la página es el primer hijo del render. */
const contenedor = (raiz: HTMLElement) => raiz.firstElementChild as HTMLElement;

describe("ProductsPage — hueco bajo el botón flotante (T3-09)", () => {
    beforeEach(() => {
        rol = "ADMIN";
    });

    it("sin selección no hay botón flotante ni hueco reservado", () => {
        const { container } = renderWithProviders(<ProductsPage />);

        expect(screen.queryByRole("button", { name: /Movimiento manual/ })).toBeNull();
        expect(contenedor(container).className).not.toMatch(/\bpb-28\b/);
    });

    it("con un producto seleccionado aparecen el botón y el hueco a la vez", async () => {
        const user = userEvent.setup();
        const { container } = renderWithProviders(<ProductsPage />);

        await user.click(screen.getByRole("checkbox", { name: "Seleccionar Teclado Logitech" }));

        expect(screen.getByRole("button", { name: /Movimiento manual/ })).toBeInTheDocument();
        expect(contenedor(container).className).toMatch(/\bpb-28\b/);
    });

    it("al deseleccionar se van los dos", async () => {
        // El hueco no puede quedarse: sin botón que lo justifique es espacio muerto al
        // final de la página.
        const user = userEvent.setup();
        const { container } = renderWithProviders(<ProductsPage />);

        const casilla = screen.getByRole("checkbox", { name: "Seleccionar Teclado Logitech" });
        await user.click(casilla);
        await user.click(casilla);

        expect(screen.queryByRole("button", { name: /Movimiento manual/ })).toBeNull();
        expect(contenedor(container).className).not.toMatch(/\bpb-28\b/);
    });
});

describe("ProductsPage — leyenda de la clase ABC (T5-10)", () => {
    it("dice de qué meses sale la clasificación, como días de calendario", () => {
        renderWithProviders(<ProductsPage />);

        // `formatearDia` y no `formatearFecha`: el 1 de septiembre no puede pintarse
        // «31 ago» en un navegador al oeste de Greenwich.
        expect(screen.getByText(/Clases ABC según la facturación del 01 sep 2025 al 31 ago 2026/)).toBeInTheDocument();
    });
});

describe("ProductsPage — el rol de almacén (T5-13)", () => {
    afterEach(() => {
        rol = "ADMIN";
    });

    it("selecciona para ajustar stock en bloque o registrar un movimiento, pero no crea ni importa", async () => {
        rol = "WAREHOUSE";
        const user = userEvent.setup();
        renderWithProviders(<ProductsPage />);

        await user.click(screen.getByRole("checkbox", { name: "Seleccionar Teclado Logitech" }));

        expect(screen.getByRole("button", { name: /Ajuste masivo/ })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Movimiento manual/ })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Nuevo producto/ })).toBeNull();
        expect(screen.queryByRole("button", { name: /Importar/ })).toBeNull();
    });

    it("T6-08 — un SELLER no cambia precios ni stock: ni selecciona, ni crea, ni importa", () => {
        rol = "SELLER";
        renderWithProviders(<ProductsPage />);

        expect(screen.queryByRole("checkbox", { name: "Seleccionar Teclado Logitech" })).toBeNull();
        expect(screen.queryByRole("button", { name: /Nuevo producto/ })).toBeNull();
        expect(screen.queryByRole("button", { name: /Importar/ })).toBeNull();
        expect(screen.queryByRole("button", { name: /^Editar/ })).toBeNull();
    });

    it("un USER no puede seleccionar", () => {
        rol = "USER";
        renderWithProviders(<ProductsPage />);

        expect(screen.queryByRole("checkbox", { name: "Seleccionar Teclado Logitech" })).toBeNull();
    });
});
