import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import StockMovementsPage from "@/modules/products/components/StockMovementsPage";
import * as api from "@/modules/products/api/product.api";
import type { MovementsResponse, StockMovement } from "@/modules/products/types/product.types";

/**
 * T4-15 — la pantalla de movimientos con el histórico paginado.
 *
 * Lo que se vigila aquí no es el aspecto: es **quién filtra y quién exporta**. Las dos
 * cosas funcionaban en el navegador porque el endpoint devolvía el histórico entero, y
 * las dos se rompen en silencio al paginarlo:
 *
 * - un filtro que se quede en el cliente filtra **solo la página traída** y enseña un
 *   resultado que depende de en qué página estabas;
 * - una exportación construida desde el array en pantalla escribe **la página** y produce
 *   un archivo que se abre, tiene filas y parece correcto.
 *
 * Ninguna de las dos lanza un error, así que solo se ven comprobando **con qué argumentos
 * se llama al servidor**.
 */

vi.mock("react-router-dom", async () => ({
    ...(await vi.importActual<typeof import("react-router-dom")>("react-router-dom")),
    useParams: () => ({ id: "p1" }),
}));

vi.mock("@/modules/products/api/product.api", () => ({
    getProductMovements: vi.fn(),
    getPriceHistory: vi.fn().mockResolvedValue({ product: {}, history: [] }),
    exportProductMovementsCsv: vi.fn().mockResolvedValue(undefined),
}));

const producto = {
    id: "p1",
    name: "Teclado Logitech",
    description: null,
    sku: "PER-LOG",
    price: "100.00",
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
};

const movimiento = (i: number): StockMovement => ({
    id: `m${i}`,
    productId: "p1",
    type: "IN",
    delta: 1,
    stockAfter: i,
    note: `mov ${i}`,
    createdAt: `2026-03-${String(i).padStart(2, "0")}T10:00:00Z`,
});

/** 120 movimientos repartidos en 3 páginas de 50, como los devolvería el backend. */
function respuesta(page = 1, total = 120): MovementsResponse {
    return {
        product: producto,
        movements: Array.from({ length: Math.min(50, Math.max(0, total - (page - 1) * 50)) }, (_, i) => movimiento(i + 1)),
        meta: { total, page, limit: 50, totalPages: Math.ceil(total / 50) },
    } as MovementsResponse;
}

const getMovements = vi.mocked(api.getProductMovements);

beforeEach(() => {
    vi.clearAllMocks();
    getMovements.mockResolvedValue(respuesta());
});

describe("StockMovementsPage — histórico paginado (T4-15)", () => {
    it("pide la primera página al abrir, no el histórico entero", async () => {
        renderWithProviders(<StockMovementsPage />);

        await screen.findByText("Teclado Logitech");
        expect(getMovements).toHaveBeenCalledWith("p1", expect.objectContaining({ page: 1 }));
    });

    it("el recuento sale del total del servidor, no de la página cargada", async () => {
        // La pestaña dice cuántos movimientos hay: 120. Si saliera de `movements.length`
        // diría 50 y nadie sabría que hay más.
        renderWithProviders(<StockMovementsPage />);

        expect(await screen.findByRole("button", { name: "Movimientos (120)" })).toBeInTheDocument();
    });

    it("el filtro de tipo se manda al servidor", async () => {
        const user = userEvent.setup();
        renderWithProviders(<StockMovementsPage />);
        await screen.findByText("Teclado Logitech");

        await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de movimiento" }), "OUT");

        await waitFor(() =>
            expect(getMovements).toHaveBeenCalledWith("p1", expect.objectContaining({ type: "OUT" })),
        );
    });

    it("filtrar vuelve a la página 1", async () => {
        // Filtrar desde la página 3 pediría la página 3 del resultado filtrado, que casi
        // nunca existe: la tabla saldría vacía con los filtros puestos y parecería que no
        // hay nada.
        const user = userEvent.setup();
        renderWithProviders(<StockMovementsPage />);
        await screen.findByText("Teclado Logitech");

        await user.click(screen.getByRole("button", { name: "Siguiente" }));
        await waitFor(() => expect(getMovements).toHaveBeenCalledWith("p1", expect.objectContaining({ page: 2 })));

        await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de movimiento" }), "IN");

        await waitFor(() =>
            expect(getMovements).toHaveBeenLastCalledWith("p1", expect.objectContaining({ page: 1, type: "IN" })),
        );
    });

    it("la exportación la hace el servidor, no la página en pantalla", async () => {
        const user = userEvent.setup();
        renderWithProviders(<StockMovementsPage />);
        await screen.findByText("Teclado Logitech");

        await user.click(screen.getByRole("button", { name: /Exportar/ }));

        expect(api.exportProductMovementsCsv).toHaveBeenCalledWith("p1", "Teclado Logitech", {
            type: "",
            dateFrom: "",
            dateTo: "",
        });
    });

    it("la exportación arrastra los filtros puestos", async () => {
        // Exportar «todo» ignorando el filtro visible devolvería un archivo que no se parece
        // a lo que hay en pantalla. Y es lo que hace accionable el 413 del tope de filas:
        // un producto con más movimientos que el máximo se exporta por tramos.
        const user = userEvent.setup();
        renderWithProviders(<StockMovementsPage />);
        await screen.findByText("Teclado Logitech");

        await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de movimiento" }), "OUT");
        await user.click(screen.getByRole("button", { name: /Exportar/ }));

        expect(api.exportProductMovementsCsv).toHaveBeenCalledWith(
            "p1",
            "Teclado Logitech",
            expect.objectContaining({ type: "OUT" }),
        );
    });

    it("sin más de una página no se pinta el control de paginación", async () => {
        getMovements.mockResolvedValue(respuesta(1, 12));
        renderWithProviders(<StockMovementsPage />);

        await screen.findByText("Teclado Logitech");
        expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
    });

    it("con filtros y sin resultados, los filtros siguen en pantalla", async () => {
        // Si desaparecieran al vaciarse la tabla, no habría forma de deshacer el filtro
        // que la vació.
        const user = userEvent.setup();
        renderWithProviders(<StockMovementsPage />);
        await screen.findByText("Teclado Logitech");

        getMovements.mockResolvedValue({ ...respuesta(1, 0), movements: [] });
        await user.selectOptions(screen.getByRole("combobox", { name: "Tipo de movimiento" }), "ADJUSTMENT");

        expect(await screen.findByText(/No hay movimientos que coincidan/)).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: "Tipo de movimiento" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeInTheDocument();
    });
});
