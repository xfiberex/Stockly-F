import { screen, act, fireEvent } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import userEvent from "@testing-library/user-event";
import { ProductFilters } from "@/modules/products/components/ProductFilters";

// ProductFilters usa useCategories para cargar categorías dinámicas
vi.mock("@/modules/catalog/hooks/useCategories", () => ({
    useCategories: () => ({
        data: [{ id: "cat-electronica", name: "Electrónica" }],
    }),
}));

// ...y useTags para el filtro por etiqueta (vacío => no se renderiza ese select)
vi.mock("@/modules/tags/hooks/useTags", () => ({
    useTags: () => ({ data: [] }),
}));

// T5-10 — el recuento de cada clase para las opciones del filtro ABC.
vi.mock("@/modules/reports/hooks/useReports", () => ({
    useAbcSummary: () => ({
        data: { from: "2025-09-01", to: "2026-08-31", timezone: "America/Santo_Domingo", calculatedAt: "2026-09-29T12:00:00Z", counts: { A: 3, B: 7, C: 90 } },
    }),
}));

// T5-14 — con un solo almacén el filtro por almacén no se pinta: siguen siendo tres desplegables.
// Con varios lo comprueba `Almacenes.test.tsx`.
vi.mock("@/modules/warehouses/hooks/useWarehouses", () => ({
    useAlmacenes: () => ({ almacenes: [], activos: [], predeterminado: undefined, hayVarios: false, nombreDe: () => "—", isLoading: false }),
}));

describe("ProductFilters", () => {
    it("renderiza el campo de búsqueda y los tres selects", () => {
        renderWithProviders(<ProductFilters onFilterChange={vi.fn()} />);
        expect(screen.getByPlaceholderText(/buscar producto/i)).toBeInTheDocument();
        expect(screen.getAllByRole("combobox")).toHaveLength(3);
    });

    it("AUD-018 — el buscador tiene nombre accesible, no solo el texto de ayuda", () => {
        renderWithProviders(<ProductFilters onFilterChange={vi.fn()} />);
        // Por rol y nombre, que es como lo encuentra un lector de pantalla: el `placeholder`
        // desaparece al escribir y no todos los lectores lo anuncian.
        expect(screen.getByRole("textbox", { name: "Buscar producto" })).toBeInTheDocument();
    });

    it("filtra por clase ABC, con cuántos productos tiene cada una (T5-10)", async () => {
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);

        const select = screen.getByRole("combobox", { name: "Filtrar por clase ABC" });
        expect(screen.getByRole("option", { name: "Clase C (90)" })).toBeInTheDocument();

        await userEvent.selectOptions(select, "A");
        expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ abcClass: "A" }));

        await userEvent.selectOptions(select, "");
        expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ abcClass: undefined }));
    });

    it("llama a onFilterChange en el montaje con los valores iniciales", () => {
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        expect(onFilterChange).toHaveBeenCalledWith({
            search: undefined,
            categoryId: undefined,
            isActive: true,
        });
    });

    // ---- Tests de debounce con fake timers + fireEvent para evitar conflictos ----

    it("no emite la búsqueda antes de que transcurran los 400ms de debounce", async () => {
        vi.useFakeTimers();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        fireEvent.change(screen.getByPlaceholderText(/buscar producto/i), {
            target: { value: "Teclado" },
        });
        await act(async () => vi.advanceTimersByTime(200));

        const callsWithSearch = onFilterChange.mock.calls.filter((c) => c[0].search === "Teclado");
        expect(callsWithSearch).toHaveLength(0);
        vi.useRealTimers();
    });

    it("emite la búsqueda debounced tras 400ms", async () => {
        vi.useFakeTimers();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        fireEvent.change(screen.getByPlaceholderText(/buscar producto/i), {
            target: { value: "Monitor" },
        });
        await act(async () => vi.advanceTimersByTime(400));

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: "Monitor" }),
        );
        vi.useRealTimers();
    });

    it("solo emite el último valor si el usuario escribe rápido", async () => {
        vi.useFakeTimers();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        fireEvent.change(screen.getByPlaceholderText(/buscar producto/i), {
            target: { value: "Mon" },
        });
        await act(async () => vi.advanceTimersByTime(200));
        fireEvent.change(screen.getByPlaceholderText(/buscar producto/i), {
            target: { value: "Monitor" },
        });
        await act(async () => vi.advanceTimersByTime(400));

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: "Monitor" }),
        );
        const callsWithMon = onFilterChange.mock.calls.filter((c) => c[0].search === "Mon");
        expect(callsWithMon).toHaveLength(0);
        vi.useRealTimers();
    });

    // ---- Tests de selects sin fake timers ----

    it("emite el categoryId de la categoría seleccionada", async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        const [categorySelect] = screen.getAllByRole("combobox");
        await user.selectOptions(categorySelect, "cat-electronica");

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ categoryId: "cat-electronica" }),
        );
    });

    it("emite isActive=false al seleccionar 'Solo inactivos'", async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        const [, statusSelect] = screen.getAllByRole("combobox");
        await user.selectOptions(statusSelect, "false");

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ isActive: false }),
        );
    });

    it("emite isActive=undefined al seleccionar 'Todos'", async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        const [, statusSelect] = screen.getAllByRole("combobox");
        await user.selectOptions(statusSelect, "");

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ isActive: undefined }),
        );
    });
});

/**
 * AUD-013 — en el móvil, los desplegables van plegados tras «Filtros (n)»: seis controles a lo
 * alto empujaban la primera fila de la tabla hasta el pliegue. Se ocultan con CSS (`max-md:hidden`)
 * y no se desmontan, así que lo elegido sobrevive a plegarlos.
 */
describe("ProductFilters — plegados en el móvil (AUD-013)", () => {
    it("el botón despliega y pliega los desplegables, y dice cuántos filtros hay puestos", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductFilters onFilterChange={vi.fn()} />);
        const boton = screen.getByRole("button", { name: "Filtros" });
        const panel = document.getElementById("filtros-de-productos")!;

        expect(boton).toHaveAttribute("aria-expanded", "false");
        expect(panel).toHaveClass("max-md:hidden");
        await user.click(boton);
        expect(boton).toHaveAttribute("aria-expanded", "true");
        expect(panel).not.toHaveClass("max-md:hidden");

        await user.selectOptions(screen.getByRole("combobox", { name: "Filtrar por categoría" }), "cat-electronica");
        await user.click(boton);
        expect(screen.getByRole("button", { name: "Filtros (1)" })).toBeInTheDocument();
        // Plegado, lo elegido sigue ahí.
        expect(screen.getByRole("combobox", { name: "Filtrar por categoría" })).toHaveValue("cat-electronica");
    });
});

/**
 * AUD-019 — los filtros viven en la URL: se perdían al ir a los movimientos de un producto y
 * volver, y una lista filtrada no se podía compartir.
 */
describe("ProductFilters — en la URL (AUD-019)", () => {
    /** Lo que la barra de direcciones diría. */
    function Direccion() {
        return <output data-testid="direccion">{useLocation().search}</output>;
    }
    const direccion = () => new URLSearchParams(screen.getByTestId("direccion").textContent ?? "");

    it("abre con los filtros que trae la URL", () => {
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />, {
            initialRoute: "/catalog/products?buscar=Monitor&categoria=cat-electronica&abc=B&activos=inactivos",
        });

        expect(screen.getByRole("textbox", { name: "Buscar producto" })).toHaveValue("Monitor");
        expect(onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({ search: "Monitor", categoryId: "cat-electronica", abcClass: "B", isActive: false }),
        );
    });

    it("`?activos=todos`, el enlace del panel, abre con «Todos»; una clase ABC inventada se ignora", () => {
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />, { initialRoute: "/?activos=todos&abc=Z" });

        expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ isActive: undefined, abcClass: undefined }));
    });

    it("lo que se elige queda en la URL, sin pisar los parámetros de la página", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <>
                <ProductFilters onFilterChange={vi.fn()} />
                <Direccion />
            </>,
            { initialRoute: "/catalog/products?aviso=stockBajo" },
        );

        // Con los valores por defecto no se escribe nada: «Activos» es lo que se ve sin filtro.
        expect(direccion().get("activos")).toBeNull();

        const [categoria, estado] = screen.getAllByRole("combobox");
        await user.selectOptions(categoria!, "cat-electronica");
        await user.selectOptions(estado!, "");

        expect(direccion().get("categoria")).toBe("cat-electronica");
        expect(direccion().get("activos")).toBe("todos");
        expect(direccion().get("aviso")).toBe("stockBajo");

        await user.selectOptions(categoria!, "");
        expect(direccion().get("categoria")).toBeNull();
    });
});
