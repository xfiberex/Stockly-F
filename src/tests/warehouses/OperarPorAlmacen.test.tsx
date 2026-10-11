import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import MostradorPage from "@/modules/sale-orders/components/MostradorPage";
import { ManualMovementModal } from "@/modules/products/components/ManualMovementModal";
import { BulkStockModal } from "@/modules/products/components/BulkStockModal";
import InventoryCountsPage from "@/modules/inventory-counts/components/InventoryCountsPage";
import type { CounterSaleDto, SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";
import type { Product } from "@/modules/products/types/product.types";

/**
 * T5-14 — operar con varios almacenes: el mostrador, el movimiento a mano, el ajuste masivo y
 * abrir un conteo.
 *
 * Lo que se vigila es lo mismo en los cuatro: que **la petición diga en qué almacén**, que la
 * cifra que se enseña sea la **de ese almacén** y no el total, y que cambiar de almacén la
 * recalcule. Que con un solo almacén nada de esto aparezca lo comprueban los tests de cada
 * pantalla, que corren con uno.
 */

const ALMACENES = [
    { id: "w-central", name: "Tienda Central", address: null, isDefault: true, isActive: true, createdAt: "", updatedAt: "", products: 0, units: 0, costValue: 0, unitsWithoutCost: 0 },
    { id: "w-norte", name: "Sucursal Norte", address: null, isDefault: false, isActive: true, createdAt: "", updatedAt: "", products: 0, units: 0, costValue: 0, unitsWithoutCost: 0 },
];

const NIVELES = [
    { warehouseId: "w-central", stock: 6, committedStock: 1, availableStock: 5 },
    { warehouseId: "w-norte", stock: 4, committedStock: 3, availableStock: 1 },
];
const TECLADO = { id: "p-teclado", name: "Teclado", price: "50", stock: 10, minStock: 0, committedStock: 4, availableStock: 6, isActive: true, stockLevels: NIVELES };

const estado = vi.hoisted(() => ({
    vendidas: [] as unknown[],
    movimientos: [] as unknown[],
    ajustes: [] as unknown[],
    conteos: [] as unknown[],
}));

vi.mock("@/modules/warehouses/api/warehouses.api", () => ({ getWarehouses: () => Promise.resolve(ALMACENES) }));
vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: () => ({ user: { id: "u1", name: "Sofía", role: "ADMIN" } }) }));
vi.mock("@/modules/settings/hooks/useNegocio", () => ({ useNegocio: () => ({ data: { taxName: "ITBIS", taxRate: 0 } }) }));
vi.mock("@/modules/products/hooks/useProducts", () => ({ useProducts: () => ({ data: { data: [TECLADO] } }) }));
vi.mock("@/modules/products/hooks/useBuscarPorCodigo", () => ({ useBuscarPorCodigo: () => ({ buscar: vi.fn(), buscando: false }) }));
vi.mock("@/modules/customers/hooks/useCustomers", () => ({ useCustomers: () => ({ data: { data: [] }, isPlaceholderData: false }) }));
vi.mock("@/shared/components/EscanerModal", () => ({ EscanerModal: () => null }));
vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useVentaDeMostrador: () => ({
        mutate: (dto: CounterSaleDto, opciones?: { onSuccess?: (orden: SaleOrder) => void }) => { estado.vendidas.push(dto); void opciones; },
        isPending: false,
    }),
}));
vi.mock("@/modules/products/hooks/useManualMovement", () => ({
    useManualMovement: () => ({ mutate: (dto: unknown) => { estado.movimientos.push(dto); }, isPending: false }),
}));
vi.mock("@/modules/products/hooks/useBulkStock", () => ({
    useBulkStock: () => ({ mutate: (dto: unknown) => { estado.ajustes.push(dto); }, isPending: false }),
}));
vi.mock("@/modules/catalog/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/modules/inventory-counts/hooks/useInventoryCounts", () => ({
    useInventoryCounts: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } }, isLoading: false }),
    useCreateInventoryCount: () => ({ mutate: (dto: unknown) => { estado.conteos.push(dto); }, isPending: false }),
}));

beforeEach(() => {
    estado.vendidas.length = 0;
    estado.movimientos.length = 0;
    estado.ajustes.length = 0;
    estado.conteos.length = 0;
    localStorage.clear();
});

describe("el mostrador con varios locales (T5-14)", () => {
    async function conTeclado() {
        const user = userEvent.setup();
        renderWithProviders(<MostradorPage />);
        const local = await screen.findByRole("combobox", { name: "Vendes desde" });
        await user.click(screen.getByRole("combobox", { name: "Producto" }));
        await user.click(await screen.findByRole("option", { name: /Teclado/ }));
        return { user, local };
    }

    it("vende desde el predeterminado mientras nadie elige, y lo dice en la petición", async () => {
        const { user, local } = await conTeclado();

        expect(local).toHaveValue("w-central");
        // El disponible de la línea es el de la central (5), no el de todos (6).
        expect(screen.getByText("Disponible: 5")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Registrar venta" }));
        expect(estado.vendidas).toEqual([{ customerId: undefined, warehouseId: "w-central", items: [{ productId: "p-teclado", quantity: 1 }] }]);
    });

    it("cambiar de local recalcula el disponible de las líneas que ya había, sin volver a pedirlas", async () => {
        const { user, local } = await conTeclado();
        const cantidad = screen.getByRole("spinbutton", { name: "Cantidad de Teclado" });
        await user.clear(cantidad);
        await user.type(cantidad, "3");
        expect(screen.getByRole("button", { name: "Registrar venta" })).toBeEnabled();

        await user.selectOptions(local, "w-norte");

        // En el norte solo hay 1 disponible: las 3 que cabían en la central ya no caben.
        expect(screen.getByText("Solo hay 1 disponibles")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Registrar venta" })).toBeDisabled();
    });

    it("recuerda el local en este dispositivo: la caja de una sucursal vende siempre desde la misma", async () => {
        const { user, local } = await conTeclado();
        await user.selectOptions(local, "w-norte");
        expect(localStorage.getItem("stockly.mostrador.almacen")).toBe("w-norte");

        // Otra visita, en el mismo navegador.
        document.body.innerHTML = "";
        renderWithProviders(<MostradorPage />);
        await waitFor(() => expect(screen.getAllByRole("combobox", { name: "Vendes desde" }).at(-1)).toHaveValue("w-norte"));
    });

    it("si el local recordado ya no existe o está desactivado, vuelve al predeterminado", async () => {
        localStorage.setItem("stockly.mostrador.almacen", "w-que-ya-no-esta");
        const user = userEvent.setup();
        renderWithProviders(<MostradorPage />);

        expect(await screen.findByRole("combobox", { name: "Vendes desde" })).toHaveValue("w-central");

        // Y no solo lo que ensena el desplegable: lo que viaja en la venta tambien es el
        // predeterminado. Con el recordado, el servidor responderia 404.
        await user.click(screen.getByRole("combobox", { name: "Producto" }));
        await user.click(await screen.findByRole("option", { name: /Teclado/ }));
        await user.click(screen.getByRole("button", { name: "Registrar venta" }));
        expect(estado.vendidas).toEqual([expect.objectContaining({ warehouseId: "w-central" })]);
    });
});

describe("el movimiento a mano y el ajuste masivo (T5-14)", () => {
    const producto = TECLADO as unknown as Product;

    it("un movimiento dice en qué almacén ocurre, y enseña lo que hay en él junto al total", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ManualMovementModal isOpen onClose={vi.fn()} product={producto} />);
        const dialogo = within(screen.getByRole("dialog"));

        const selector = await dialogo.findByRole("combobox", { name: "Almacén" });
        expect(dialogo.getByText(/Stock en este almacén:/).textContent).toBe("Stock en este almacén: 6 · 10 en total");

        await user.selectOptions(selector, "w-norte");
        expect(dialogo.getByText(/Stock en este almacén:/).textContent).toBe("Stock en este almacén: 4 · 10 en total");

        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Compra a proveedor");
        await user.click(dialogo.getByRole("button", { name: "Registrar" }));

        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]).toMatchObject({ type: "IN", quantity: 1, reason: "Compra a proveedor", warehouseId: "w-norte" });
    });

    it("el ajuste masivo fija las existencias de un almacén: el «actual» que enseña es el de ese", async () => {
        const user = userEvent.setup();
        renderWithProviders(<BulkStockModal isOpen onClose={vi.fn()} products={[producto]} selectedIds={new Set(["p-teclado"])} />);
        const dialogo = within(screen.getByRole("dialog"));

        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Almacén" }), "w-norte");
        expect(dialogo.getByText("Stock actual: 4")).toBeInTheDocument();

        await user.type(dialogo.getByPlaceholderText("4"), "9");
        await user.click(dialogo.getByRole("button", { name: "Aplicar ajustes" }));

        expect(estado.ajustes).toEqual([expect.objectContaining({ warehouseId: "w-norte", items: [{ productId: "p-teclado", stock: 9 }] })]);
    });
});

describe("abrir un conteo (T5-14)", () => {
    it("se cuenta un almacén, y va en la petición", async () => {
        const user = userEvent.setup();
        renderWithProviders(<InventoryCountsPage />);

        await user.click(screen.getByRole("button", { name: "Nuevo conteo" }));
        const dialogo = within(screen.getByRole("dialog", { name: "Nuevo conteo" }));
        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Almacén que se cuenta" }), "w-norte");
        await user.click(dialogo.getByRole("button", { name: "Abrir conteo" }));

        expect(estado.conteos).toEqual([{ warehouseId: "w-norte", categoryId: null, note: undefined }]);
    });
});
