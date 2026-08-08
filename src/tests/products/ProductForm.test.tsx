import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import { ProductForm } from "@/modules/products/components/ProductForm";
import type { Product } from "@/modules/products/types/product.types";

const createMutate = vi.fn();
const updateMutate = vi.fn();

const etiquetas = [
    { id: "tag-1", name: "Oferta", color: "#ef4444" },
    { id: "tag-2", name: "Novedad", color: "#22c55e" },
    // Color oscuro de verdad: el rojo y el verde de arriba contrastan mejor con negro.
    { id: "tag-3", name: "Marina", color: "#1e3a8a" },
];

const productoExistente: Product = {
    id: "prod-1",
    name: "Teclado mecánico",
    description: "Switches azules",
    sku: "PER-GEN-TECL",
    price: 49.99,
    stock: 12,
    minStock: 3,
    category: null,
    brand: null,
    supplier: null,
    tags: [etiquetas[0]],
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
};

vi.mock("@/modules/products/hooks/useCreateProduct", () => ({
    useCreateProduct: () => ({ mutate: createMutate, isPending: false }),
}));
vi.mock("@/modules/products/hooks/useUpdateProduct", () => ({
    useUpdateProduct: () => ({ mutate: updateMutate, isPending: false }),
}));
vi.mock("@/modules/catalog/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/modules/catalog/hooks/useBrands", () => ({ useBrands: () => ({ data: [] }) }));
vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({ useSuppliers: () => ({ data: [] }) }));
vi.mock("@/modules/tags/hooks/useTags", () => ({ useTags: () => ({ data: etiquetas }) }));

describe("ProductForm", () => {
    beforeEach(() => {
        createMutate.mockClear();
        updateMutate.mockClear();
    });

    it("no renderiza nada cuando isOpen=false", () => {
        renderWithProviders(<ProductForm isOpen={false} onClose={vi.fn()} />);
        expect(screen.queryByText("Nuevo producto")).toBeNull();
    });

    it("renderiza el título y los campos principales en modo creación", () => {
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);
        expect(screen.getByText("Nuevo producto")).toBeInTheDocument();
        expect(screen.getByLabelText("Nombre *")).toBeInTheDocument();
        expect(screen.getByLabelText("Precio *")).toBeInTheDocument();
    });

    it("llama a onClose al pulsar Cancelar", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        renderWithProviders(<ProductForm isOpen onClose={onClose} />);
        await user.click(screen.getByRole("button", { name: /cancelar/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it("bloquea el envío y no llama a la mutación si faltan campos obligatorios", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);
        await user.click(screen.getByRole("button", { name: /crear producto/i }));
        await waitFor(() => {
            expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
        });
        expect(createMutate).not.toHaveBeenCalled();
    });

    it("envía los datos a la mutación de creación cuando el formulario es válido", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);

        await user.type(screen.getByLabelText("Nombre *"), "Teclado mecánico");
        await user.type(screen.getByLabelText("Precio *"), "49.99");
        await user.click(screen.getByRole("button", { name: /crear producto/i }));

        await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
        expect(createMutate.mock.calls[0][0]).toMatchObject({ name: "Teclado mecánico", price: 49.99 });
    });

    // El formulario ya no sincroniza los valores con un efecto: nacen puestos, porque
    // `ProductsPage` lo remonta con `key` al cambiar de producto (T1-10). Estos dos
    // tests son la red que detecta que esa precarga deje de funcionar.
    it("precarga los campos del producto al editar", () => {
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={productoExistente} />);

        expect(screen.getByText("Editar producto")).toBeInTheDocument();
        expect(screen.getByLabelText("Nombre *")).toHaveValue("Teclado mecánico");
        expect(screen.getByLabelText("Precio *")).toHaveValue(49.99);
        expect(screen.getByLabelText("Stock inicial")).toHaveValue(12);
    });

    it("precarga las etiquetas del producto y las envía al actualizar", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={productoExistente} />);

        await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

        await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
        expect(updateMutate.mock.calls[0][0]).toMatchObject({
            id: "prod-1",
            dto: { tagIds: ["tag-1"] },
        });
    });

    it("permite añadir y quitar etiquetas sobre las ya precargadas", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={productoExistente} />);

        await user.click(screen.getByRole("button", { name: /novedad/i }));  // añade tag-2
        await user.click(screen.getByRole("button", { name: /oferta/i }));   // quita tag-1
        await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

        await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
        expect(updateMutate.mock.calls[0][0]).toMatchObject({ dto: { tagIds: ["tag-2"] } });
    });

    // T2-17: la selección se comunicaba solo por color de fondo, así que quien no
    // distingue el color no sabía qué etiquetas estaban puestas.
    describe("accesibilidad de los conmutadores de etiqueta", () => {
        it("expone el estado de cada etiqueta con aria-pressed", () => {
            renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={productoExistente} />);

            expect(screen.getByRole("button", { name: /oferta/i })).toHaveAttribute("aria-pressed", "true");
            expect(screen.getByRole("button", { name: /novedad/i })).toHaveAttribute("aria-pressed", "false");
        });

        it("el estado cambia al pulsar", async () => {
            const user = userEvent.setup();
            renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={productoExistente} />);

            await user.click(screen.getByRole("button", { name: /novedad/i }));

            expect(screen.getByRole("button", { name: /novedad/i })).toHaveAttribute("aria-pressed", "true");
        });

        it("agrupa los conmutadores bajo el rótulo «Etiquetas»", () => {
            renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);

            expect(screen.getByRole("group", { name: /etiquetas/i })).toBeInTheDocument();
        });

        it("el texto de una etiqueta seleccionada usa el color que contrasta con su fondo", async () => {
            const user = userEvent.setup();
            renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={productoExistente} />);

            // «Oferta» (#ef4444) viene seleccionada. Pese a parecer oscuro, ese rojo
            // contrasta más con negro (5.7) que con blanco (3.7): texto negro.
            expect(screen.getByRole("button", { name: /oferta/i })).toHaveStyle({ color: "#000000" });

            // «Marina» (#1e3a8a) sí es oscura: al seleccionarla, texto blanco.
            await user.click(screen.getByRole("button", { name: /marina/i }));
            expect(screen.getByRole("button", { name: /marina/i })).toHaveStyle({ color: "#ffffff" });
        });
    });
});
