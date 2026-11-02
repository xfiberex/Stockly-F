import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import { MAXIMO_DE_LINEAS_DE_VENTA } from "@/shared/contratos";

/**
 * AUD-005 — una orden de venta admite `MAXIMO_DE_LINEAS_DE_VENTA` líneas: la API rechaza una
 * más con 422. El formulario no la ofrece, para que el tope no se descubra al guardar.
 *
 * El tope se baja a 3 **solo aquí**: pintar las 100 líneas de verdad cuesta 25 s en jsdom, y lo
 * que se comprueba es que el formulario lee la constante del contrato, no cuánto vale.
 */
vi.mock("@/shared/contratos", async (original) => ({
    ...(await original<typeof import("@/shared/contratos")>()),
    MAXIMO_DE_LINEAS_DE_VENTA: 3,
}));

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }, isLoading: false }),
    useCreateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useShipSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

// Un producto distinto por código, para que cada escaneo abra una línea y no sume a otra.
const buscar = vi.fn(async (codigo: string) => ({
    id: `p-${codigo}`, name: `Producto ${codigo}`, price: "10", isActive: true, stock: 50, committedStock: 0, availableStock: 50,
}));
vi.mock("@/modules/products/hooks/useBuscarPorCodigo", () => ({
    useBuscarPorCodigo: () => ({ buscar, buscando: false }),
}));

describe("SaleOrdersPage — tope de líneas (AUD-005)", () => {
    it(`con ${MAXIMO_DE_LINEAS_DE_VENTA} líneas, «Agregar ítem» deja de añadir y dice por qué`, async () => {
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);
        await user.click(screen.getByRole("button", { name: /Nueva orden/ }));
        const dialogo = screen.getByRole("dialog");
        const agregar = within(dialogo).getByRole("button", { name: "Agregar ítem" });

        // El formulario abre con una línea: faltan las demás hasta el tope.
        for (let i = 1; i < MAXIMO_DE_LINEAS_DE_VENTA; i++) fireEvent.click(agregar);

        expect(within(dialogo).getAllByLabelText("Cant.")).toHaveLength(MAXIMO_DE_LINEAS_DE_VENTA);
        expect(agregar).toBeDisabled();
        expect(agregar).toHaveAttribute("title", `Una orden admite ${MAXIMO_DE_LINEAS_DE_VENTA} líneas como mucho.`);
    });

    it("escanear con todas las líneas ocupadas no abre otra: lo dice", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);
        await user.click(screen.getByRole("button", { name: /Nueva orden/ }));
        const dialogo = screen.getByRole("dialog", { name: /Nueva orden/ });
        const escanear = async (codigo: string) => {
            await user.click(within(dialogo).getByRole("button", { name: "Escanear" }));
            await user.type(screen.getByLabelText("O escríbelo"), `${codigo}{Enter}`);
        };

        for (let i = 0; i < MAXIMO_DE_LINEAS_DE_VENTA; i++) await escanear(`C${i}`);
        expect(within(dialogo).getAllByLabelText("Cant.")).toHaveLength(MAXIMO_DE_LINEAS_DE_VENTA);

        await escanear("UNO-MAS");

        expect(within(dialogo).getAllByLabelText("Cant.")).toHaveLength(MAXIMO_DE_LINEAS_DE_VENTA);
        expect(within(dialogo).getByRole("alert")).toHaveTextContent(`Una orden admite ${MAXIMO_DE_LINEAS_DE_VENTA} líneas como mucho.`);
    });
});
