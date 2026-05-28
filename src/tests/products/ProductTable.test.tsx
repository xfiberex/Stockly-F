import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import { ProductTable } from "@/modules/products/components/ProductTable";
import type { Product } from "@/modules/products/types/product.types";

vi.mock("@/modules/products/hooks/useDeleteProduct", () => ({
    useDeleteProduct: vi.fn(),
}));
vi.mock("@/modules/products/hooks/useRestoreProduct", () => ({
    useRestoreProduct: vi.fn(),
}));

import { useDeleteProduct } from "@/modules/products/hooks/useDeleteProduct";
import { useRestoreProduct } from "@/modules/products/hooks/useRestoreProduct";

const mockDeleteMutate = vi.fn();
const mockRestoreMutate = vi.fn();

beforeEach(() => {
    vi.mocked(useDeleteProduct).mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useDeleteProduct>);
    vi.mocked(useRestoreProduct).mockReturnValue({
        mutate: mockRestoreMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useRestoreProduct>);
});

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
    id: "prod-1",
    name: "Monitor LG",
    description: "27 pulgadas",
    price: 299.99,
    stock: 10,
    category: "Electrónica",
    isActive: true,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
});

describe("ProductTable", () => {
    it("muestra spinner cuando isLoading=true", () => {
        renderWithProviders(<ProductTable products={[]} isLoading onEdit={vi.fn()} />);
        // No muestra tabla ni mensaje de vacío
        expect(screen.queryByRole("table")).toBeNull();
        expect(screen.queryByText(/no se encontraron/i)).toBeNull();
    });

    it("muestra mensaje de vacío cuando no hay productos", () => {
        renderWithProviders(<ProductTable products={[]} isLoading={false} onEdit={vi.fn()} />);
        expect(screen.getByText(/no se encontraron/i)).toBeInTheDocument();
    });

    it("renderiza la tabla con productos", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct()]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.getByText("Monitor LG")).toBeInTheDocument();
    });

    it("muestra precio formateado con $", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ price: 299.99 })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("$299.99")).toBeInTheDocument();
    });

    it("muestra badge 'Activo' para producto activo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ isActive: true })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("Activo")).toBeInTheDocument();
    });

    it("muestra badge 'Inactivo' para producto inactivo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ isActive: false })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("Inactivo")).toBeInTheDocument();
    });

    it("muestra botones Editar y Eliminar para producto activo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ isActive: true })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByTitle("Editar")).toBeInTheDocument();
        expect(screen.getByTitle("Eliminar")).toBeInTheDocument();
        expect(screen.queryByTitle("Restaurar")).toBeNull();
    });

    it("muestra botón Restaurar para producto inactivo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ isActive: false })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByTitle("Restaurar")).toBeInTheDocument();
        expect(screen.queryByTitle("Editar")).toBeNull();
        expect(screen.queryByTitle("Eliminar")).toBeNull();
    });

    it("llama a onEdit con el producto al hacer clic en Editar", async () => {
        const user = userEvent.setup();
        const onEdit = vi.fn();
        const product = makeProduct();
        renderWithProviders(<ProductTable products={[product]} isLoading={false} onEdit={onEdit} />);
        await user.click(screen.getByTitle("Editar"));
        expect(onEdit).toHaveBeenCalledWith(product);
    });

    it("llama a deleteMutation.mutate al hacer clic en Eliminar", async () => {
        const user = userEvent.setup();
        const product = makeProduct({ id: "prod-abc" });
        renderWithProviders(<ProductTable products={[product]} isLoading={false} onEdit={vi.fn()} />);
        await user.click(screen.getByTitle("Eliminar"));
        expect(mockDeleteMutate).toHaveBeenCalledWith("prod-abc");
    });

    it("llama a restoreMutation.mutate al hacer clic en Restaurar", async () => {
        const user = userEvent.setup();
        const product = makeProduct({ id: "prod-xyz", isActive: false });
        renderWithProviders(<ProductTable products={[product]} isLoading={false} onEdit={vi.fn()} />);
        await user.click(screen.getByTitle("Restaurar"));
        expect(mockRestoreMutate).toHaveBeenCalledWith("prod-xyz");
    });

    it("aplica texto rojo cuando stock es menor o igual a 3", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ stock: 2 })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("2")).toHaveClass("text-red-600");
    });

    it("no aplica texto rojo cuando stock es mayor a 3", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ stock: 10 })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("10")).not.toHaveClass("text-red-600");
    });

    it("muestra N/A cuando el producto no tiene imagen", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ imageUrl: undefined })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("muestra la imagen cuando el producto tiene imageUrl", () => {
        renderWithProviders(
            <ProductTable
                products={[makeProduct({ imageUrl: "https://res.cloudinary.com/test.jpg" })]}
                isLoading={false}
                onEdit={vi.fn()}
            />,
        );
        expect(screen.getByRole("img")).toHaveAttribute("src", "https://res.cloudinary.com/test.jpg");
    });

    it("renderiza múltiples productos correctamente", () => {
        const products = [
            makeProduct({ id: "1", name: "Producto A" }),
            makeProduct({ id: "2", name: "Producto B" }),
            makeProduct({ id: "3", name: "Producto C" }),
        ];
        renderWithProviders(<ProductTable products={products} isLoading={false} onEdit={vi.fn()} />);
        expect(screen.getByText("Producto A")).toBeInTheDocument();
        expect(screen.getByText("Producto B")).toBeInTheDocument();
        expect(screen.getByText("Producto C")).toBeInTheDocument();
    });
});
