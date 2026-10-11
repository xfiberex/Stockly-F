import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import WarehousesPage from "@/modules/warehouses/components/WarehousesPage";
import { SelectorDeAlmacen } from "@/modules/warehouses/components/SelectorDeAlmacen";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { disponibleEn, stockEn } from "@/shared/lib/almacenes";
import type { Rol } from "@/shared/contratos";
import type { WarehouseWithFigures } from "@/modules/warehouses/types/warehouses.types";

/**
 * T5-14 — los almacenes: la pantalla que los gestiona, el selector que usan los demás
 * formularios y las dos cuentas de las que sale el disponible de una venta.
 *
 * Lo que se vigila: que **con un solo almacén no aparezca nada que hable de almacenes**; que
 * con varios, un formulario ofrezca solo los activos y un filtro los ofrezca todos; y que cada
 * botón de la pantalla salga de la matriz de permisos y haga lo que dice.
 */

const almacen = (cambios: Partial<WarehouseWithFigures> & Pick<WarehouseWithFigures, "id" | "name">): WarehouseWithFigures => ({
    address: null, isDefault: false, isActive: true,
    createdAt: "2026-10-10T10:00:00.000Z", updatedAt: "2026-10-10T10:00:00.000Z",
    products: 0, units: 0, costValue: 0, unitsWithoutCost: 0,
    ...cambios,
});

const CENTRAL = almacen({ id: "w-central", name: "Tienda Central", address: "Av. Principal 1", isDefault: true, products: 40, units: 741, costValue: 15230.5 });
const NORTE = almacen({ id: "w-norte", name: "Sucursal Norte", products: 8, units: 85, costValue: 990, unitsWithoutCost: 6 });
const VIEJA = almacen({ id: "w-vieja", name: "Bodega Vieja", isActive: false });

const api = vi.hoisted(() => ({
    almacenes: [] as unknown[],
    resumenPedido: 0,
    createWarehouse: vi.fn(),
    updateWarehouse: vi.fn(),
    setDefaultWarehouse: vi.fn(),
    setWarehouseActive: vi.fn(),
}));

let rol: Rol = "ADMIN";

vi.mock("@/modules/warehouses/api/warehouses.api", () => ({
    getWarehouses: () => Promise.resolve(api.almacenes),
    getWarehousesSummary: () => { api.resumenPedido += 1; return Promise.resolve(api.almacenes); },
    createWarehouse: api.createWarehouse,
    updateWarehouse: api.updateWarehouse,
    setDefaultWarehouse: api.setDefaultWarehouse,
    setWarehouseActive: api.setWarehouseActive,
}));
vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: () => ({ user: { id: "u1", name: "Ana", role: rol } }) }));
vi.mock("@/shared/hooks/useSimboloDeMoneda", () => ({ useSimboloDeMoneda: () => "$" }));

// Para `ProductFilters`, que se monta al final con varios almacenes.
vi.mock("@/modules/catalog/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/modules/tags/hooks/useTags", () => ({ useTags: () => ({ data: [] }) }));
vi.mock("@/modules/reports/hooks/useReports", () => ({ useAbcSummary: () => ({ data: undefined }) }));

const tarjeta = (nombre: string) => screen.getByRole("heading", { name: nombre }).closest("li")!;

beforeEach(() => {
    rol = "ADMIN";
    api.almacenes = [CENTRAL, NORTE, VIEJA];
    api.resumenPedido = 0;
    for (const doble of [api.createWarehouse, api.updateWarehouse, api.setDefaultWarehouse, api.setWarehouseActive]) {
        doble.mockReset().mockResolvedValue(NORTE);
    }
});

describe("WarehousesPage (T5-14)", () => {
    it("enseña cada almacén con lo que guarda, y dice cuál es el predeterminado y cuál está desactivado", async () => {
        renderWithProviders(<WarehousesPage />);

        const central = within(await waitFor(() => tarjeta("Tienda Central")));
        expect(central.getByText("Av. Principal 1")).toBeInTheDocument();
        expect(central.getByText("Predeterminado")).toBeInTheDocument();
        expect(central.getByText("741")).toBeInTheDocument();
        expect(central.getByText("$15,230.50")).toBeInTheDocument();

        const norte = within(tarjeta("Sucursal Norte"));
        expect(norte.getByText("Sin dirección")).toBeInTheDocument();
        expect(norte.queryByText("Predeterminado")).not.toBeInTheDocument();
        // Lo que no tiene coste no suma cero en silencio: se dice aparte.
        expect(norte.getByText("6 unidades de productos sin coste no suman al valor.")).toBeInTheDocument();
        expect(central.queryByText(/sin coste/)).not.toBeInTheDocument();

        expect(within(tarjeta("Bodega Vieja")).getByText("Inactivo")).toBeInTheDocument();
    });

    it("el predeterminado no se puede desactivar ni volver a elegir; uno desactivado solo se puede activar o editar", async () => {
        renderWithProviders(<WarehousesPage />);
        await screen.findByRole("heading", { name: "Tienda Central" });

        const central = within(tarjeta("Tienda Central"));
        expect(central.getByRole("button", { name: "Editar Tienda Central" })).toBeInTheDocument();
        expect(central.queryByRole("button", { name: /Desactivar|Hacer predeterminado/ })).not.toBeInTheDocument();

        const vieja = within(tarjeta("Bodega Vieja"));
        expect(vieja.getByRole("button", { name: "Activar Bodega Vieja" })).toBeInTheDocument();
        expect(vieja.queryByRole("button", { name: /Hacer predeterminado/ })).not.toBeInTheDocument();
    });

    it("cada botón llama a su ruta, con el almacén de su tarjeta", async () => {
        const user = userEvent.setup();
        renderWithProviders(<WarehousesPage />);
        await screen.findByRole("heading", { name: "Sucursal Norte" });

        await user.click(screen.getByRole("button", { name: "Hacer predeterminado Sucursal Norte" }));
        await waitFor(() => expect(api.setDefaultWarehouse).toHaveBeenCalledWith("w-norte"));

        await user.click(screen.getByRole("button", { name: "Desactivar Sucursal Norte" }));
        await waitFor(() => expect(api.setWarehouseActive).toHaveBeenCalledWith("w-norte", false));

        await user.click(screen.getByRole("button", { name: "Activar Bodega Vieja" }));
        await waitFor(() => expect(api.setWarehouseActive).toHaveBeenLastCalledWith("w-vieja", true));
    });

    it("el alta manda el nombre sin espacios alrededor, y no deja guardar uno vacío", async () => {
        const user = userEvent.setup();
        renderWithProviders(<WarehousesPage />);
        await screen.findByRole("heading", { name: "Tienda Central" });

        await user.click(screen.getByRole("button", { name: "Nuevo almacén" }));
        const dialogo = within(screen.getByRole("dialog", { name: "Nuevo almacén" }));
        expect(dialogo.getByRole("button", { name: "Guardar" })).toBeDisabled();

        await user.type(dialogo.getByLabelText("Nombre"), "   ");
        expect(dialogo.getByRole("button", { name: "Guardar" })).toBeDisabled();

        await user.type(dialogo.getByLabelText("Nombre"), "Sucursal Sur ");
        await user.type(dialogo.getByLabelText("Dirección (opcional)"), "Calle 9");
        await user.click(dialogo.getByRole("button", { name: "Guardar" }));

        await waitFor(() => expect(api.createWarehouse).toHaveBeenCalledWith({ name: "Sucursal Sur", address: "Calle 9" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("editar abre el formulario con los datos de ese almacén y guarda sobre él", async () => {
        const user = userEvent.setup();
        renderWithProviders(<WarehousesPage />);
        await screen.findByRole("heading", { name: "Tienda Central" });

        await user.click(screen.getByRole("button", { name: "Editar Tienda Central" }));
        const dialogo = within(screen.getByRole("dialog", { name: "Editar almacén" }));
        expect(dialogo.getByLabelText("Nombre")).toHaveValue("Tienda Central");
        expect(dialogo.getByLabelText("Dirección (opcional)")).toHaveValue("Av. Principal 1");

        await user.clear(dialogo.getByLabelText("Dirección (opcional)"));
        await user.click(dialogo.getByRole("button", { name: "Guardar" }));

        // La dirección vacía viaja vacía: es la forma de quitarla.
        await waitFor(() => expect(api.updateWarehouse).toHaveBeenCalledWith("w-central", { name: "Tienda Central", address: "" }));
        expect(api.createWarehouse).not.toHaveBeenCalled();
    });

    it.each<Rol>(["USER", "WAREHOUSE", "SELLER"])("un %s ve los almacenes y ningún botón para cambiarlos", async (quien) => {
        rol = quien;
        renderWithProviders(<WarehousesPage />);

        await screen.findByRole("heading", { name: "Sucursal Norte" });
        expect(screen.getByText("85")).toBeInTheDocument();
        expect(screen.queryAllByRole("button")).toHaveLength(0);
    });
});

describe("SelectorDeAlmacen (T5-14)", () => {
    const montar = (props: Partial<Parameters<typeof SelectorDeAlmacen>[0]> = {}) => {
        const onChange = vi.fn();
        renderWithProviders(<><p>listo</p><SelectorDeAlmacen value="" onChange={onChange} {...props} /></>);
        return onChange;
    };
    const opciones = () => screen.getAllByRole("option").map((o) => o.textContent);

    it("con un solo almacén activo no pinta nada: no hay nada que elegir", async () => {
        api.almacenes = [CENTRAL, VIEJA];
        montar();

        // Se espera a que la lista haya llegado: antes de eso tampoco hay nada, y no probaría nada.
        await screen.findByText("listo");
        await new Promise((r) => setTimeout(r, 20));
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("en un formulario ofrece solo los activos, y avisa del que se elige", async () => {
        const user = userEvent.setup();
        const onChange = montar({ value: "w-central" });

        const selector = await screen.findByRole("combobox", { name: "Almacén" });
        expect(opciones()).toEqual(["Tienda Central", "Sucursal Norte"]);
        // Un selector pide la lista, no las cifras: esas recorren todo el catálogo.
        expect(api.resumenPedido).toBe(0);

        await user.selectOptions(selector, "Sucursal Norte");
        expect(onChange).toHaveBeenCalledWith("w-norte");
    });

    it("como filtro añade «todos» y los desactivados, que tienen historia que consultar", async () => {
        montar({ comoFiltro: true });

        await screen.findByRole("combobox", { name: "Almacén" });
        expect(opciones()).toEqual(["Todos los almacenes", "Tienda Central", "Sucursal Norte", "Bodega Vieja (desactivado)"]);
    });

    it("un filtro se ofrece también con un solo almacén activo si hay otro desactivado", async () => {
        api.almacenes = [CENTRAL, VIEJA];
        montar({ comoFiltro: true });

        expect(await screen.findByRole("combobox", { name: "Almacén" })).toBeInTheDocument();
    });

    it("no ofrece el excluido: el origen, al elegir el destino de una transferencia", async () => {
        montar({ excluir: "w-central", label: "Entra en" });

        await screen.findByRole("combobox", { name: "Entra en" });
        expect(opciones()).toEqual(["Sucursal Norte"]);
    });

    it("con la etiqueta oculta, el rótulo sigue siendo su nombre accesible", async () => {
        montar({ comoFiltro: true, etiquetaOculta: true, label: "Con existencias en" });

        expect(await screen.findByRole("combobox", { name: "Con existencias en" })).toBeInTheDocument();
        expect(screen.queryByText("Con existencias en")).not.toBeInTheDocument();
    });

    it("el catálogo filtra por lo que hay en un almacén cuando hay más de uno", async () => {
        const user = userEvent.setup();
        const onFilterChange = vi.fn();
        renderWithProviders(<ProductFilters onFilterChange={onFilterChange} />);

        await user.selectOptions(await screen.findByRole("combobox", { name: "Con existencias en" }), "Sucursal Norte");

        await waitFor(() => expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ warehouseId: "w-norte" })));
    });
});

describe("disponibleEn y stockEn (T5-14)", () => {
    const producto = {
        stock: 10,
        availableStock: 6,
        stockLevels: [
            { warehouseId: "w-central", stock: 6, expiredStock: 0, committedStock: 1, availableStock: 5 },
            { warehouseId: "w-norte", stock: 4, expiredStock: 0, committedStock: 3, availableStock: 1 },
        ],
    };

    it("sin almacén, lo de todos; con él, lo de ese", () => {
        expect(disponibleEn(producto)).toBe(6);
        expect(disponibleEn(producto, "w-norte")).toBe(1);
        expect(stockEn(producto)).toBe(10);
        expect(stockEn(producto, "w-central")).toBe(6);
    });

    it("en un almacén donde no hay fila, cero: el desglose es disperso", () => {
        expect(disponibleEn(producto, "w-sur")).toBe(0);
        expect(stockEn(producto, "w-sur")).toBe(0);
        expect(stockEn({ stock: 3 }, "w-central")).toBe(0);
    });
});
