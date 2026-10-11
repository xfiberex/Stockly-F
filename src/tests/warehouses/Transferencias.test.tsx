import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import TransfersPage from "@/modules/stock-transfers/components/TransfersPage";
import type { Rol } from "@/shared/contratos";

/**
 * T5-14 — las transferencias entre almacenes.
 *
 * Lo que se vigila: que lo que sale hacia el servidor sea **de dónde, adónde y un producto con
 * su cantidad por línea**; que el disponible con el que se valida sea el **del origen**, que es
 * de donde sale; y que la pantalla no ofrezca transferir cuando no hay adónde.
 */

const ALMACENES = [
    { id: "w-central", name: "Tienda Central", address: null, isDefault: true, isActive: true, createdAt: "", updatedAt: "", products: 2, units: 10, costValue: 0, unitsWithoutCost: 0 },
    { id: "w-norte", name: "Sucursal Norte", address: null, isDefault: false, isActive: true, createdAt: "", updatedAt: "", products: 1, units: 4, costValue: 0, unitsWithoutCost: 0 },
];

// 10 en total: 6 en la central (1 comprometida) y 4 en el norte (3 comprometidas).
const TECLADO = {
    id: "p-teclado", name: "Teclado", sku: "TEC-1", price: "50", stock: 10, committedStock: 4, availableStock: 6, isActive: true,
    stockLevels: [
        { warehouseId: "w-central", stock: 6, committedStock: 1, availableStock: 5 },
        { warehouseId: "w-norte", stock: 4, committedStock: 3, availableStock: 1 },
    ],
};
const RATON = { id: "p-raton", name: "Ratón", sku: null, price: "25", stock: 2, committedStock: 0, availableStock: 2, isActive: true, stockLevels: [{ warehouseId: "w-central", stock: 2, committedStock: 0, availableStock: 2 }] };

const TRANSFERENCIA = {
    id: "abcdef12-0000-4000-8000-000000000001",
    fromWarehouse: { id: "w-central", name: "Tienda Central" },
    toWarehouse: { id: "w-norte", name: "Sucursal Norte" },
    note: "Reposición del lunes",
    createdByEmail: "almacen@stockly.app",
    createdAt: "2026-10-10T15:00:00.000Z",
    lines: 2,
    units: 7,
};

const api = vi.hoisted(() => ({
    almacenes: [] as unknown[],
    lista: [] as unknown[],
    getStockTransfers: vi.fn(),
    getStockTransfer: vi.fn(),
    createStockTransfer: vi.fn(),
}));

let rol: Rol = "WAREHOUSE";

vi.mock("@/modules/warehouses/api/warehouses.api", () => ({ getWarehouses: () => Promise.resolve(api.almacenes) }));
vi.mock("@/modules/stock-transfers/api/stock-transfers.api", () => ({
    getStockTransfers: api.getStockTransfers,
    getStockTransfer: api.getStockTransfer,
    createStockTransfer: api.createStockTransfer,
}));
vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: () => ({ user: { id: "u1", name: "Luis", role: rol } }) }));
vi.mock("@/modules/products/hooks/useProducts", () => ({ useProducts: () => ({ data: { data: [TECLADO, RATON] } }) }));

async function abrirFormulario() {
    const user = userEvent.setup();
    renderWithProviders(<TransfersPage />);
    await user.click(await screen.findByRole("button", { name: "Nueva transferencia" }));
    return { user, dialogo: within(screen.getByRole("dialog", { name: "Nueva transferencia" })) };
}

async function anadir(user: ReturnType<typeof userEvent.setup>, dialogo: ReturnType<typeof within>, nombre: RegExp) {
    await user.click(dialogo.getByRole("combobox", { name: "Producto" }));
    await user.click(await dialogo.findByRole("option", { name: nombre }));
}

beforeEach(() => {
    rol = "WAREHOUSE";
    api.almacenes = ALMACENES;
    api.lista = [TRANSFERENCIA];
    api.getStockTransfers.mockReset().mockImplementation(async () => ({ data: api.lista, meta: { total: api.lista.length, page: 1, limit: 20, totalPages: 1 } }));
    api.getStockTransfer.mockReset().mockResolvedValue({
        ...TRANSFERENCIA,
        items: [
            { productId: "p-teclado", name: "Teclado", sku: "TEC-1", quantity: 5, fromStockAfter: 1, toStockAfter: 9 },
            { productId: "p-raton", name: "Ratón", sku: null, quantity: 2, fromStockAfter: 0, toStockAfter: 2 },
        ],
    });
    api.createStockTransfer.mockReset().mockResolvedValue({ ...TRANSFERENCIA, items: [] });
});

describe("TransfersPage (T5-14)", () => {
    it("lista cada transferencia con su origen, su destino, quién la hizo y cuánto movió", async () => {
        renderWithProviders(<TransfersPage />);

        const fila = within((await screen.findByRole("button", { name: "Ver los productos de la transferencia #ABCDEF12" })).closest("li")!);
        expect(fila.getByText("Tienda Central")).toBeInTheDocument();
        expect(fila.getByText("Sucursal Norte")).toBeInTheDocument();
        expect(fila.getByText(/Transferencia #ABCDEF12 · .* · almacen@stockly\.app · Reposición del lunes/)).toBeInTheDocument();
        expect(fila.getByText("7 uds.")).toBeInTheDocument();
        expect(fila.getByText("2 productos")).toBeInTheDocument();
    });

    it("las líneas se piden al desplegar la fila, no con la lista, y dicen lo que quedó en cada extremo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TransfersPage />);
        const boton = await screen.findByRole("button", { name: "Ver los productos de la transferencia #ABCDEF12" });
        expect(api.getStockTransfer).not.toHaveBeenCalled();
        expect(boton).toHaveAttribute("aria-expanded", "false");

        await user.click(boton);

        expect(boton).toHaveAttribute("aria-expanded", "true");
        expect(api.getStockTransfer).toHaveBeenCalledWith(TRANSFERENCIA.id);
        expect(await screen.findByText("Quedan 1 en Tienda Central y 9 en Sucursal Norte")).toBeInTheDocument();
        expect(screen.getByText("TEC-1")).toBeInTheDocument();
        expect(screen.getByText("5 uds.")).toBeInTheDocument();
    });

    it("el filtro por almacén va al servidor", async () => {
        const user = userEvent.setup();
        renderWithProviders(<TransfersPage />);

        await user.selectOptions(await screen.findByRole("combobox", { name: "Almacén" }), "Sucursal Norte");

        await waitFor(() => expect(api.getStockTransfers).toHaveBeenLastCalledWith({ page: 1, limit: 20, warehouseId: "w-norte" }));
    });

    it("el criterio: lo que sale es de dónde, adónde y un producto con su cantidad por línea", async () => {
        const { user, dialogo } = await abrirFormulario();

        // Abre con el predeterminado como origen y el otro como destino.
        expect(dialogo.getByRole("combobox", { name: "Sale de" })).toHaveValue("w-central");
        expect(dialogo.getByRole("combobox", { name: "Entra en" })).toHaveValue("w-norte");
        expect(dialogo.getByRole("button", { name: "Transferir" })).toBeDisabled();

        await anadir(user, dialogo, /Teclado/);
        await anadir(user, dialogo, /Ratón/);
        // Elegir otra vez el mismo producto suma una unidad a su línea, no añade otra.
        await anadir(user, dialogo, /Ratón/);
        await user.type(dialogo.getByLabelText("Nota (opcional)"), " Reposición ");
        await user.click(dialogo.getByRole("button", { name: "Transferir" }));

        await waitFor(() =>
            expect(api.createStockTransfer).toHaveBeenCalledWith({
                fromWarehouseId: "w-central",
                toWarehouseId: "w-norte",
                note: "Reposición",
                items: [{ productId: "p-teclado", quantity: 1 }, { productId: "p-raton", quantity: 2 }],
            }),
        );
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("el disponible es el del origen, y lo que lo supera no se deja enviar", async () => {
        const { user, dialogo } = await abrirFormulario();

        // En la lista del buscador ya es el de la central (5), no el de todos (6).
        await user.click(dialogo.getByRole("combobox", { name: "Producto" }));
        await user.click(await dialogo.findByRole("option", { name: /Teclado\s*TEC-1 · Disponible: 5/ }));
        expect(dialogo.getByText("Disponible en el origen: 5")).toBeInTheDocument();

        const cantidad = dialogo.getByRole("spinbutton", { name: "Cantidad de Teclado" });
        await user.clear(cantidad);
        await user.type(cantidad, "6");

        expect(dialogo.getByText("En el origen solo hay 5 disponibles")).toBeInTheDocument();
        expect(cantidad).toHaveAttribute("aria-invalid", "true");
        expect(dialogo.getByRole("button", { name: "Transferir" })).toBeDisabled();

        await user.clear(cantidad);
        expect(dialogo.getByRole("button", { name: "Transferir" })).toBeDisabled();
        await user.type(cantidad, "5");
        expect(dialogo.getByRole("button", { name: "Transferir" })).toBeEnabled();
    });

    it("elegir como origen el que era destino los intercambia, y el disponible pasa a ser el del nuevo origen", async () => {
        const { user, dialogo } = await abrirFormulario();
        await anadir(user, dialogo, /Teclado/);

        await user.selectOptions(dialogo.getByRole("combobox", { name: "Sale de" }), "w-norte");

        expect(dialogo.getByRole("combobox", { name: "Sale de" })).toHaveValue("w-norte");
        expect(dialogo.getByRole("combobox", { name: "Entra en" })).toHaveValue("w-central");
        // La línea se conserva: lo que cambia es contra qué se valida.
        expect(dialogo.getByText("Disponible en el origen: 1")).toBeInTheDocument();

        await user.click(dialogo.getByRole("button", { name: "Transferir" }));
        await waitFor(() => expect(api.createStockTransfer).toHaveBeenCalledWith(expect.objectContaining({ fromWarehouseId: "w-norte", toWarehouseId: "w-central" })));
    });

    it("quitar una línea la saca de lo que se envía", async () => {
        const { user, dialogo } = await abrirFormulario();
        await anadir(user, dialogo, /Teclado/);
        await anadir(user, dialogo, /Ratón/);

        await user.click(dialogo.getByRole("button", { name: "Quitar Teclado" }));
        await user.click(dialogo.getByRole("button", { name: "Transferir" }));

        await waitFor(() => expect(api.createStockTransfer).toHaveBeenCalledWith(expect.objectContaining({ note: undefined, items: [{ productId: "p-raton", quantity: 1 }] })));
    });

    it("con un solo almacén no se ofrece transferir, y se dice por qué, con el camino para arreglarlo", async () => {
        api.almacenes = [ALMACENES[0]];
        api.lista = [];
        renderWithProviders(<TransfersPage />);

        expect(await screen.findByText("Todavía no hay transferencias.")).toBeInTheDocument();
        expect(screen.getByText(/hacen falta al menos dos almacenes activos/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Almacenes" })).toHaveAttribute("href", "/warehouses");
        expect(screen.queryByRole("button", { name: "Nueva transferencia" })).not.toBeInTheDocument();
    });

    it.each<Rol>(["USER", "SELLER"])("un %s las consulta, pero no las registra", async (quien) => {
        rol = quien;
        renderWithProviders(<TransfersPage />);

        expect(await screen.findByRole("button", { name: "Ver los productos de la transferencia #ABCDEF12" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Nueva transferencia" })).not.toBeInTheDocument();
    });
});
