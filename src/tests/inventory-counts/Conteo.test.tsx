import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import InventoryCountPage from "@/modules/inventory-counts/components/InventoryCountPage";
import InventoryCountsPage from "@/modules/inventory-counts/components/InventoryCountsPage";
import type { InventoryCount, InventoryCountLine, InventoryCountLinesQuery } from "@/modules/inventory-counts/types/inventory-counts.types";
import type { Rol } from "@/shared/contratos";

/**
 * T5-07 — las pantallas del conteo físico. Lo que se vigila: que la captura sea **a ciegas**
 * (sin el stock del sistema delante), que solo se envíe lo escrito, que el cierre diga cuántos
 * ajustes va a generar y cuántos productos se quedan sin tocar, y que cada rol vea sus botones.
 */

const ID = "cccccccc-1111-2222-3333-444444444444";

const resumen = { lines: 3, counted: 2, uncounted: 1, withDifference: 1, unitsOver: 0, unitsShort: 2, valueOver: 0, valueShort: 8, linesWithoutCost: 0 };

const CONTEO: InventoryCount = {
    id: ID,
    status: "OPEN",
    note: "Pasillo 2",
    category: { id: "cat", name: "Periféricos" },
    createdByEmail: "almacen@stockly.app",
    closedByEmail: null,
    createdAt: "2026-09-29T10:00:00.000Z",
    closedAt: null,
    summary: resumen,
};

const linea = (over: Partial<InventoryCountLine>): InventoryCountLine => ({
    id: `l-${over.productId}`,
    productId: "p",
    name: "Producto",
    sku: null,
    category: "Periféricos",
    countedQuantity: null,
    expectedQuantity: null,
    difference: null,
    countedAt: null,
    countedByEmail: null,
    adjustment: null,
    unitCost: null,
    ...over,
});

const LINEAS: InventoryCountLine[] = [
    linea({ productId: "p1", name: "Teclado", sku: "TEC-1", countedQuantity: 8, expectedQuantity: 10, difference: -2 }),
    linea({ productId: "p2", name: "Ratón", countedQuantity: 5, expectedQuantity: 5, difference: 0 }),
    linea({ productId: "p3", name: "Monitor" }),
];

let rol: Rol = "WAREHOUSE";
let conteo: InventoryCount = CONTEO;
const consultas: InventoryCountLinesQuery[] = [];
const anotadas: unknown[] = [];
const cierres: string[] = [];
const creados: unknown[] = [];

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Mateo", role: rol } }),
}));

vi.mock("@/modules/catalog/hooks/useCategories", () => ({
    useCategories: () => ({ data: [{ id: "cat", name: "Periféricos" }] }),
}));

vi.mock("@/modules/inventory-counts/hooks/useInventoryCounts", () => ({
    useInventoryCounts: () => ({ data: { data: [CONTEO], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }, isLoading: false }),
    useInventoryCount: () => ({ data: conteo, isLoading: false }),
    useInventoryCountLines: (_id: string, q: InventoryCountLinesQuery) => {
        consultas.push(q);
        const data = q.productId ? LINEAS.filter((l) => l.productId === q.productId)
            : q.filter === "pending" ? LINEAS.filter((l) => l.countedQuantity === null)
            : q.filter === "difference" ? LINEAS.filter((l) => l.difference)
            : LINEAS;
        return { data: { data, meta: { total: data.length, page: 1, limit: 50, totalPages: 1 } }, isLoading: false };
    },
    useCreateInventoryCount: () => ({ mutate: (dto: unknown) => creados.push(dto), isPending: false }),
    useRecordInventoryCountLines: () => ({
        mutate: (items: unknown, op?: { onSuccess?: () => void }) => { anotadas.push(items); op?.onSuccess?.(); },
        isPending: false,
    }),
    useCloseInventoryCount: () => ({
        mutate: (_: unknown, op?: { onSuccess?: () => void }) => { cierres.push(ID); op?.onSuccess?.(); },
        isPending: false,
    }),
    useCancelInventoryCount: () => ({ mutate: vi.fn(), isPending: false }),
}));

// T5-08 — el producto de cada código: «p1» está en el conteo, «fuera» no, y el resto no existe.
const buscar = vi.fn(async (codigo: string) =>
    codigo === "4006381333931" ? { id: "p1", name: "Teclado" }
    : codigo === "FUERA" ? { id: "fuera", name: "Silla" }
    : null);
vi.mock("@/modules/products/hooks/useBuscarPorCodigo", () => ({
    useBuscarPorCodigo: () => ({ buscar, buscando: false }),
}));

const pantallaDeSesion = () =>
    renderWithProviders(
        <Routes>
            <Route path="/inventory-counts/:id" element={<InventoryCountPage />} />
        </Routes>,
        { initialRoute: `/inventory-counts/${ID}` },
    );

beforeEach(() => {
    rol = "WAREHOUSE";
    conteo = CONTEO;
    consultas.length = 0;
    anotadas.length = 0;
    cierres.length = 0;
    creados.length = 0;
});

describe("Conteo físico — la sesión (T5-07)", () => {
    it("la captura es a ciegas: sin columna de esperado, y abre en lo que queda por contar", () => {
        pantallaDeSesion();

        expect(consultas.at(-1)).toMatchObject({ filter: "pending" });
        expect(screen.queryByRole("columnheader", { name: "Esperado" })).not.toBeInTheDocument();
        expect(screen.getByLabelText("Cantidad contada de Monitor")).toBeInTheDocument();
    });

    it("guarda solo lo escrito, en enteros, y no lo vacío ni lo que no es un número", async () => {
        const user = userEvent.setup();
        pantallaDeSesion();
        await user.click(screen.getByRole("checkbox", { name: "Solo por contar" }));

        fireEvent.change(screen.getByLabelText("Cantidad contada de Monitor"), { target: { value: "12" } });
        // Se toca y se deja en el valor que ya tenía: no se reenvía. (Dos cambios: uno solo al
        // mismo valor no dispara `onChange`, y el test no probaría nada.)
        fireEvent.change(screen.getByLabelText("Cantidad contada de Ratón"), { target: { value: "6" } });
        fireEvent.change(screen.getByLabelText("Cantidad contada de Ratón"), { target: { value: "5" } });
        fireEvent.change(screen.getByLabelText("Cantidad contada de Teclado"), { target: { value: "" } });

        await user.click(screen.getByRole("button", { name: "Guardar (1)" }));

        expect(anotadas).toEqual([[{ productId: "p3", countedQuantity: 12 }]]);
    });

    it("revisar enseña esperado, contado y diferencia con signo", async () => {
        const user = userEvent.setup();
        pantallaDeSesion();

        await user.click(screen.getByRole("button", { name: "Revisar" }));

        expect(consultas.at(-1)).toMatchObject({ filter: "difference" });
        const fila = screen.getByRole("row", { name: /Teclado/ });
        expect(within(fila).getByText("10")).toBeInTheDocument();
        expect(within(fila).getByText("8")).toBeInTheDocument();
        expect(within(fila).getByText("−2")).toBeInTheDocument();
    });

    it("cerrar pide confirmación y dice cuántos ajustes genera y cuántos quedan sin tocar", async () => {
        const user = userEvent.setup();
        pantallaDeSesion();

        await user.click(screen.getByRole("button", { name: "Cerrar conteo" }));
        const dialogo = screen.getByRole("dialog");
        expect(within(dialogo).getByText(/Se generará 1 ajuste de stock/)).toBeInTheDocument();
        expect(within(dialogo).getByText("1 producto sin contar no se tocará.")).toBeInTheDocument();
        expect(cierres).toEqual([]);

        await user.click(within(dialogo).getByRole("button", { name: "Cerrar y ajustar" }));
        expect(cierres).toEqual([ID]);
    });

    it("un USER solo consulta: sin captura, sin cerrar ni cancelar", () => {
        rol = "USER";
        pantallaDeSesion();

        expect(screen.queryByLabelText("Cantidad contada de Monitor")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Cerrar conteo" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Cancelar conteo" })).not.toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Esperado" })).toBeInTheDocument();
    });

    it("cerrada es su informe: con valor a coste y sin acciones", () => {
        conteo = { ...CONTEO, status: "CLOSED", closedAt: "2026-09-29T12:00:00.000Z", closedByEmail: "almacen@stockly.app" };
        LINEAS[0] = { ...LINEAS[0]!, adjustment: -2, unitCost: 4 };
        pantallaDeSesion();

        expect(screen.getByRole("columnheader", { name: "Valor a coste" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Cerrar conteo" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Revisar" })).not.toBeInTheDocument();
        expect(screen.getByText(/Cerrado el .* por almacen@stockly.app/)).toBeInTheDocument();
    });
});

describe("Conteo físico — escanear en la captura (T5-08)", () => {
    async function escanear(codigo: string) {
        const user = userEvent.setup();
        pantallaDeSesion();
        await user.click(screen.getByRole("button", { name: "Escanear" }));
        await user.type(screen.getByLabelText("O escríbelo"), `${codigo}{Enter}`);
        return user;
    }

    it("lleva a la línea del producto aunque ya esté contada, con el cursor en su campo", async () => {
        const user = await escanear("4006381333931");

        expect(consultas.at(-1)).toEqual({ page: 1, limit: 50, productId: "p1" });
        const campo = screen.getByLabelText("Cantidad contada de Teclado");
        expect(campo).toHaveFocus();
        expect(screen.getByText("Escaneado: Teclado")).toBeInTheDocument();
        // El filtro no se aplica a la línea escaneada, así que no se enseña.
        expect(screen.queryByRole("checkbox", { name: "Solo por contar" })).toBeNull();

        // Lo que se escribe reemplaza la cifra anterior: estaba seleccionada.
        await user.keyboard("9");
        expect(campo).toHaveValue(9);

        await user.click(screen.getByRole("button", { name: "Ver todos" }));
        expect(consultas.at(-1)).toMatchObject({ filter: "pending" });
    });

    it("un producto que no está en el conteo lo dice en vez de enseñar una tabla vacía", async () => {
        await escanear("FUERA");

        expect(screen.getByText("«Silla» no está en este conteo.")).toBeInTheDocument();
    });

    it("un código que no es de ningún producto avisa y deja la captura como estaba", async () => {
        await escanear("NADIE");

        expect(screen.getByRole("alert")).toHaveTextContent("Ningún producto tiene el código «NADIE».");
        expect(consultas.at(-1)).toMatchObject({ filter: "pending" });
    });
});

describe("Conteo físico — la lista (T5-07)", () => {
    it("el almacén abre un conteo de una categoría con su nota", async () => {
        const user = userEvent.setup();
        renderWithProviders(<InventoryCountsPage />);

        expect(screen.getByText("2 de 3 contados")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Nuevo conteo" }));
        const dialogo = screen.getByRole("dialog");
        await user.selectOptions(within(dialogo).getByLabelText("Qué contar"), "cat");
        await user.type(within(dialogo).getByLabelText("Nota (opcional)"), "Pasillo 2");
        await user.click(within(dialogo).getByRole("button", { name: "Abrir conteo" }));

        expect(creados).toEqual([{ categoryId: "cat", note: "Pasillo 2" }]);
    });

    it("un USER no ve «Nuevo conteo»", () => {
        rol = "USER";
        renderWithProviders(<InventoryCountsPage />);

        expect(screen.queryByRole("button", { name: "Nuevo conteo" })).not.toBeInTheDocument();
    });
});
