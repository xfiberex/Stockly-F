import { render, screen, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductFilters } from "@/modules/products/components/ProductFilters";

// ProductFilters ahora usa useCategories para cargar categorías dinámicas
vi.mock("@/modules/catalog/hooks/useCategories", () => ({
    useCategories: () => ({
        data: [{ id: "cat-electronica", name: "Electrónica" }],
    }),
}));

describe("ProductFilters", () => {
    it("renderiza el campo de búsqueda y los dos selects", () => {
        render(<ProductFilters onFilterChange={vi.fn()} />);
        expect(screen.getByPlaceholderText(/buscar producto/i)).toBeInTheDocument();
        expect(screen.getAllByRole("combobox")).toHaveLength(2);
    });

    it("llama a onFilterChange en el montaje con los valores iniciales", () => {
        const onFilterChange = vi.fn();
        render(<ProductFilters onFilterChange={onFilterChange} />);
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
        render(<ProductFilters onFilterChange={onFilterChange} />);
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
        render(<ProductFilters onFilterChange={onFilterChange} />);
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
        render(<ProductFilters onFilterChange={onFilterChange} />);
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
        render(<ProductFilters onFilterChange={onFilterChange} />);
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
        render(<ProductFilters onFilterChange={onFilterChange} />);
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
        render(<ProductFilters onFilterChange={onFilterChange} />);
        onFilterChange.mockClear();

        const [, statusSelect] = screen.getAllByRole("combobox");
        await user.selectOptions(statusSelect, "");

        expect(onFilterChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ isActive: undefined }),
        );
    });
});
