import { screen } from "@testing-library/react";
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
vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: vi.fn(),
}));

import { useDeleteProduct } from "@/modules/products/hooks/useDeleteProduct";
import { useRestoreProduct } from "@/modules/products/hooks/useRestoreProduct";
import { useAuth } from "@/modules/auth/hooks/useMe";

const mockAdmin = { id: "u1", name: "Admin", email: "admin@test.com", role: "ADMIN", isVerified: true, createdAt: "" };

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
    vi.mocked(useAuth).mockReturnValue({
        user: mockAdmin,
        isLoading: false,
        isError: false,
    } as unknown as ReturnType<typeof useAuth>);
});

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
    id: "prod-1",
    name: "Monitor LG",
    description: "27 pulgadas",
    price: 299.99,
    stock: 10,
    minStock: 0,
    category: { id: "cat-1", name: "Electrónica" },
    brand: null,
    supplier: null,
    tags: [],
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

    it("aplica estilo de alerta cuando stock es menor o igual al stock mínimo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ stock: 2, minStock: 5 })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("2")).toHaveClass("text-warning");
    });

    it("no aplica estilo de alerta cuando stock es mayor al stock mínimo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ stock: 10, minStock: 3 })]} isLoading={false} onEdit={vi.fn()} />,
        );
        expect(screen.getByText("10")).not.toHaveClass("text-warning");
    });

    it("muestra un placeholder (sin imagen) cuando el producto no tiene imageUrl", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct({ imageUrl: undefined })]} isLoading={false} onEdit={vi.fn()} />,
        );
        // El componente renderiza un icono placeholder en lugar de un <img>
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
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

// T2-14: un `<button>` dentro de un `<a>` es HTML inválido y produce dos paradas de
// tabulación por acción, multiplicado por cada fila de la tabla.
describe("ProductTable — acción de historial (T2-14)", () => {
    it("es un enlace, y no envuelve ningún botón", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct()]} isLoading={false} onEdit={vi.fn()} />,
        );

        const enlace = screen.getByRole("link", { name: "Historial de movimientos de Monitor LG" });
        expect(enlace).toHaveAttribute("href", "/catalog/products/prod-1/movements");
        expect(enlace.querySelector("button")).toBeNull();
    });

    it("ninguna fila anida contenido interactivo", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct()]} isLoading={false} onEdit={vi.fn()} />,
        );

        const anidados = document.querySelectorAll("a button, button a, a a, button button");
        expect(anidados).toHaveLength(0);
    });
});

// Con anchos automáticos, un nombre de producto largo le quita sitio a las demás
// columnas y la cabecera «Stock / Mín» —la única con un espacio dentro— se partía en
// dos líneas. Se prohíbe el salto en la cabecera en lugar de recortar el nombre, que
// es el identificador con el que se escanea la tabla.
describe("ProductTable — la cabecera no se parte", () => {
    it("la cabecera entera lleva `whitespace-nowrap`, no columna a columna", () => {
        renderWithProviders(
            <ProductTable products={[makeProduct()]} isLoading={false} onEdit={vi.fn()} />,
        );

        // `white-space` se hereda: puesto en el `<thead>`, alcanza a las nueve columnas
        // y ninguna futura nace pudiendo partirse.
        const cabecera = document.querySelector("thead")!;
        expect(cabecera.className).toContain("whitespace-nowrap");
        expect(screen.getByRole("columnheader", { name: "Stock / Mín" })).toBeInTheDocument();
    });

    it("el nombre del producto se muestra entero, sin truncar", () => {
        const largo = "Switch Administrable TP-Link TL-SG108E 8 puertos Gigabit";
        renderWithProviders(
            <ProductTable products={[makeProduct({ name: largo })]} isLoading={false} onEdit={vi.fn()} />,
        );

        const enlace = screen.getByRole("link", { name: largo });
        expect(enlace.className).not.toContain("truncate");
        expect(enlace.className).not.toContain("max-w-");
    });
});

// T2-15: las casillas gobiernan un ajuste masivo de stock —destructivo— y no había
// forma de marcar la página entera ni de saber cuántas había marcadas sin contarlas.
describe("ProductTable — selección de filas (T2-15)", () => {
    const productos = [
        makeProduct({ id: "p1", name: "Monitor LG" }),
        makeProduct({ id: "p2", name: "Teclado Logitech" }),
    ];

    function conSeleccion(seleccionados: string[] = []) {
        const onToggleSelect = vi.fn();
        renderWithProviders(
            <ProductTable
                products={productos}
                isLoading={false}
                onEdit={vi.fn()}
                selectedIds={new Set(seleccionados)}
                onToggleSelect={onToggleSelect}
            />,
        );
        return { onToggleSelect };
    }

    it("cada casilla dice a qué producto corresponde", () => {
        conSeleccion();

        expect(screen.getByRole("checkbox", { name: "Seleccionar Monitor LG" })).toBeInTheDocument();
        expect(screen.getByRole("checkbox", { name: "Seleccionar Teclado Logitech" })).toBeInTheDocument();
    });

    it("la casilla de cabecera selecciona los que faltan, sin desmarcar los ya marcados", async () => {
        const user = userEvent.setup();
        const { onToggleSelect } = conSeleccion(["p1"]);

        await user.click(screen.getByRole("checkbox", { name: /Seleccionar todos/ }));

        expect(onToggleSelect).toHaveBeenCalledTimes(1);
        expect(onToggleSelect).toHaveBeenCalledWith("p2");
    });

    it("con todo marcado, la cabecera desmarca la página entera", async () => {
        const user = userEvent.setup();
        const { onToggleSelect } = conSeleccion(["p1", "p2"]);

        const todos = screen.getByRole("checkbox", { name: /Seleccionar todos/ });
        expect(todos).toBeChecked();

        await user.click(todos);

        expect(onToggleSelect.mock.calls.map(([id]) => id)).toEqual(["p1", "p2"]);
    });

    it("una selección parcial se anuncia como indeterminada, no como «sin marcar»", () => {
        conSeleccion(["p1"]);

        const todos = screen.getByRole("checkbox", { name: /Seleccionar todos/ }) as HTMLInputElement;
        expect(todos.indeterminate).toBe(true);
        expect(todos.checked).toBe(false);
    });

    it("sin nada marcado no está ni marcada ni indeterminada", () => {
        conSeleccion();

        const todos = screen.getByRole("checkbox", { name: /Seleccionar todos/ }) as HTMLInputElement;
        expect(todos.indeterminate).toBe(false);
        expect(todos.checked).toBe(false);
    });

    it("sin `onToggleSelect` no aparece ninguna casilla", () => {
        renderWithProviders(<ProductTable products={productos} isLoading={false} onEdit={vi.fn()} />);

        expect(screen.queryByRole("checkbox")).toBeNull();
    });

    // T3-08 — sobre la tabla real, que es la que más iconos junta: los de acción de cada
    // fila y el del semáforo de stock. La comprobación va sobre el DOM renderizado y no
    // sobre el JSX, porque el `aria-hidden` lo pone Heroicons y no se ve leyendo el código.
    describe("Iconos y nombres accesibles (T3-08)", () => {
        it("ningún icono de la tabla se anuncia", () => {
            const { container } = renderWithProviders(
                <ProductTable products={[makeProduct()]} isLoading={false} onEdit={vi.fn()} />,
            );

            const iconos = Array.from(container.querySelectorAll("svg"));
            expect(iconos.length).toBeGreaterThan(0);
            for (const icono of iconos) expect(icono).toHaveAttribute("aria-hidden", "true");
        });

        it("cada acción de solo icono dice sobre qué producto actúa", () => {
            // Los botones **ya tenían nombre accesible**: `title` es el último recurso que
            // contempla la especificación de accname, y la implementación de Testing
            // Library lo usa. Comprobado antes de tocar nada, para no arreglar un
            // problema inexistente.
            //
            // Lo que fallaba es otra cosa: el nombre era el mismo en todas las filas. En
            // una tabla de cincuenta productos, cincuenta botones llamados «Editar» no
            // permiten saber cuál se está editando, y `title` además no se muestra en
            // pantallas táctiles. El enlace de historial ya llevaba el producto en su
            // `aria-label` desde T2-14; ahora los botones también.
            renderWithProviders(
                <ProductTable products={[makeProduct()]} isLoading={false} onEdit={vi.fn()} />,
            );

            expect(screen.getByRole("button", { name: "Ver detalles de Monitor LG" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Editar Monitor LG" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Eliminar Monitor LG" })).toBeInTheDocument();
        });

        it("dos filas no comparten el nombre de sus acciones", () => {
            renderWithProviders(
                <ProductTable
                    products={[makeProduct(), makeProduct({ id: "prod-2", name: "Teclado Logitech" })]}
                    isLoading={false}
                    onEdit={vi.fn()}
                />,
            );

            const nombres = screen
                .getAllByRole("button")
                .map((b) => b.getAttribute("aria-label"))
                .filter((n): n is string => n !== null);

            expect(new Set(nombres).size).toBe(nombres.length);
        });

        it("la acción de restaurar de un producto inactivo también lo nombra", () => {
            renderWithProviders(
                <ProductTable
                    products={[makeProduct({ isActive: false })]}
                    isLoading={false}
                    onEdit={vi.fn()}
                />,
            );

            expect(screen.getByRole("button", { name: "Restaurar Monitor LG" })).toBeInTheDocument();
        });
    });
});
