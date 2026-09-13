import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";

/**
 * T5-03 — el formulario de venta no deja pedir más de lo disponible.
 *
 * La decisión fue **avisar y no permitir**: el disponible se ve al elegir el producto, se
 * marca al pasarse y el envío no sale. El backend rechaza igualmente con 409; esto es lo que
 * evita llegar a él en el caso normal.
 */

const PRODUCTOS = [
    { id: "p-teclado", name: "Teclado", price: "30", stock: 10, committedStock: 7, availableStock: 3 },
    { id: "p-monitor", name: "Monitor", price: "200", stock: 5, committedStock: 0, availableStock: 5 },
];

const creadas: unknown[] = [];

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => ({ data: { data: [] }, isLoading: false }),
    useCreateSaleOrder: () => ({
        mutate: (dto: unknown, opciones?: { onSuccess?: () => void }) => {
            creadas.push(dto);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
    useUpdateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: PRODUCTOS } }),
}));

async function abrir() {
    const user = userEvent.setup();
    renderWithProviders(<SaleOrdersPage />);
    await user.click(screen.getByRole("button", { name: /Nueva orden/ }));
    return { user, dialogo: screen.getByRole("dialog") };
}

async function cantidad(user: ReturnType<typeof userEvent.setup>, campo: HTMLElement, valor: number) {
    await user.clear(campo);
    await user.type(campo, String(valor));
}

describe("SaleOrdersPage — disponible en el formulario (T5-03)", () => {
    beforeEach(() => {
        creadas.length = 0;
    });

    it("al elegir un producto dice cuánto hay disponible, no cuánto stock", async () => {
        const { user, dialogo } = await abrir();

        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "p-teclado");

        // Stock 10, pero 7 ya están prometidos: se pueden vender 3.
        expect(within(dialogo).getByText("Disponible: 3")).toBeInTheDocument();
    });

    it("pasarse de lo disponible no deja crear la venta y lo dice en el campo", async () => {
        const { user, dialogo } = await abrir();

        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "p-teclado");
        await cantidad(user, within(dialogo).getByLabelText("Cant."), 4);
        // Aviso mientras se escribe, antes de intentar guardar.
        expect(within(dialogo).getByText("Disponible: 3")).toHaveClass("text-danger");

        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(await within(dialogo).findByText("Supera lo disponible")).toBeInTheDocument();
        expect(creadas).toHaveLength(0);
    });

    it("bajar la cantidad a lo disponible quita el error y deja crearla", async () => {
        const { user, dialogo } = await abrir();

        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "p-teclado");
        const campo = within(dialogo).getByLabelText("Cant.");
        await cantidad(user, campo, 4);
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));
        await within(dialogo).findByText("Supera lo disponible");

        await cantidad(user, campo, 3);
        expect(within(dialogo).queryByText("Supera lo disponible")).not.toBeInTheDocument();

        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));
        expect(creadas).toHaveLength(1);
        expect(creadas[0]).toMatchObject({ items: [{ productId: "p-teclado", quantity: 3 }] });
    });

    it("dos líneas del mismo producto suman: 2 + 2 no caben en 3 aunque cada una sí", async () => {
        const { user, dialogo } = await abrir();

        await user.click(within(dialogo).getByRole("button", { name: /Agregar ítem/ }));
        const productos = within(dialogo).getAllByLabelText("Producto");
        const cantidades = within(dialogo).getAllByLabelText("Cant.");
        await user.selectOptions(productos[0]!, "p-teclado");
        await user.selectOptions(productos[1]!, "p-teclado");
        await cantidad(user, cantidades[0]!, 2);
        await cantidad(user, cantidades[1]!, 2);

        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(await within(dialogo).findAllByText("Supera lo disponible")).toHaveLength(2);
        expect(creadas).toHaveLength(0);
    });

    it("un ítem escrito a mano no tiene disponible que comprobar", async () => {
        const { user, dialogo } = await abrir();

        await user.type(within(dialogo).getByLabelText("Nombre"), "Instalación");
        await cantidad(user, within(dialogo).getByLabelText("Cant."), 99);
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(within(dialogo).queryByText(/Disponible:/)).not.toBeInTheDocument();
        expect(creadas).toHaveLength(1);
    });
});
