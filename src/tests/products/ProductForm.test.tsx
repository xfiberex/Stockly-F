import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import { ProductForm } from "@/modules/products/components/ProductForm";

const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock("@/modules/products/hooks/useCreateProduct", () => ({
    useCreateProduct: () => ({ mutate: createMutate, isPending: false }),
}));
vi.mock("@/modules/products/hooks/useUpdateProduct", () => ({
    useUpdateProduct: () => ({ mutate: updateMutate, isPending: false }),
}));
vi.mock("@/modules/catalog/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/modules/catalog/hooks/useBrands", () => ({ useBrands: () => ({ data: [] }) }));
vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({ useSuppliers: () => ({ data: [] }) }));
vi.mock("@/modules/tags/hooks/useTags", () => ({ useTags: () => ({ data: [] }) }));

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
});
