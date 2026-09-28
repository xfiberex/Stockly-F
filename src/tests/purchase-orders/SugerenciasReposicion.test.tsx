import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SugerenciasReposicionPage from "@/modules/purchase-orders/components/SugerenciasReposicionPage";
import type { SugerenciaReposicion } from "@/shared/contratos";

/**
 * T5-05 — la pantalla donde se revisan las sugerencias antes de que exista ninguna orden.
 *
 * Lo que más importa es lo que **no** debe pasar: generar una línea sin precio conocido con
 * un precio inventado —el de venta, que la primera recepción fijaría como coste—, u ofrecer
 * generar la de un producto sin proveedor, que el backend rechazaría con el lote entero.
 */

const sugerencia = (over: Partial<SugerenciaReposicion>): SugerenciaReposicion => ({
    productId: "p",
    productName: "Producto",
    sku: null,
    supplier: { id: "norte", name: "Norte" },
    leadTimeDays: 7,
    leadTimeIsDefault: false,
    stock: 5,
    committedStock: 0,
    availableStock: 5,
    minStock: 10,
    pendingReceipt: 0,
    unitsOut: 60,
    dailyVelocity: 2,
    suggestedQuantity: 19,
    proposedUnitPrice: 3.25,
    priceSource: "LAST_PURCHASE",
    ...over,
});

/** Norte con dos productos (uno sin precio), Sur sin plazo propio, y un huérfano. */
const FILAS = [
    sugerencia({ productId: "tornillo", productName: "Tornillo", sku: "TOR-1" }),
    sugerencia({ productId: "tuerca", productName: "Tuerca", suggestedQuantity: 4, proposedUnitPrice: null, priceSource: null }),
    sugerencia({ productId: "arandela", productName: "Arandela", supplier: { id: "sur", name: "Sur" }, leadTimeIsDefault: true, suggestedQuantity: 8, proposedUnitPrice: 1, priceSource: "COST" }),
    sugerencia({ productId: "clavo", productName: "Clavo", supplier: null, suggestedQuantity: 2, proposedUnitPrice: null, priceSource: null }),
];

let filas: SugerenciaReposicion[] = [];
const generadas: unknown[] = [];

vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    useReorderSuggestions: () => ({
        data: { data: filas, meta: { total: filas.length, page: 1, limit: 50, totalPages: 1 }, days: 30, defaultLeadTimeDays: 7 },
        isLoading: false,
    }),
    useGenerateFromSuggestions: () => ({
        mutate: (vars: unknown, opciones?: { onSuccess?: () => void }) => {
            generadas.push(vars);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
}));

function pintar() {
    const user = userEvent.setup();
    renderWithProviders(<SugerenciasReposicionPage />);
    return { user, generar: screen.getByRole("button", { name: "Generar órdenes" }) };
}

describe("Sugerencias de reposición (T5-05)", () => {
    beforeEach(() => {
        filas = FILAS;
        generadas.length = 0;
    });

    it("agrupa por proveedor, dice cuándo el plazo es el de Configuración y deja al huérfano sin casilla", () => {
        pintar();

        expect(screen.getByRole("columnheader", { name: /^Norte/ })).toHaveTextContent("Plazo: 7 días");
        expect(screen.getByRole("columnheader", { name: /^Sur/ })).toHaveTextContent("(por defecto)");
        expect(screen.getByRole("columnheader", { name: /^Sin proveedor/ })).toBeInTheDocument();

        expect(screen.getByRole("checkbox", { name: "Incluir Tornillo" })).toBeInTheDocument();
        expect(screen.queryByRole("checkbox", { name: "Incluir Clavo" })).not.toBeInTheDocument();
        expect(screen.queryByRole("spinbutton", { name: "Cantidad a pedir de Clavo" })).not.toBeInTheDocument();
    });

    it("marca de salida las líneas con precio conocido; la que no lo tiene empieza vacía y sin marcar", () => {
        pintar();

        expect(screen.getByRole("checkbox", { name: "Incluir Tornillo" })).toBeChecked();
        expect(screen.getByRole("checkbox", { name: "Incluir Arandela" })).toBeChecked();
        expect(screen.getByRole("checkbox", { name: "Incluir Tuerca" })).not.toBeChecked();
        // Nunca el precio de venta: el campo se queda vacío y dice por qué.
        expect(screen.getByRole("spinbutton", { name: "Precio unitario de Tuerca" })).toHaveValue(null);
        expect(screen.getByText("Sin precio conocido")).toBeInTheDocument();
        expect(screen.getByText("Último pagado")).toBeInTheDocument();
        expect(screen.getByText("Coste medio")).toBeInTheDocument();

        expect(screen.getByText(/2 líneas marcadas · Se crearán 2 órdenes de compra/)).toBeInTheDocument();
    });

    it("genera con la cantidad y el precio editados, solo lo marcado", async () => {
        const { user, generar } = pintar();

        const cantidad = screen.getByRole("spinbutton", { name: "Cantidad a pedir de Tornillo" });
        await user.clear(cantidad);
        await user.type(cantidad, "25");
        await user.click(screen.getByRole("checkbox", { name: "Incluir Arandela" }));
        await user.click(generar);

        expect(generadas).toEqual([{ items: [{ productId: "tornillo", quantity: 25, unitPrice: 3.25 }] }]);
    });

    it("marcar una línea sin precio bloquea el botón hasta escribirlo", async () => {
        const { user, generar } = pintar();

        await user.click(screen.getByRole("checkbox", { name: "Incluir Tuerca" }));

        expect(generar).toBeDisabled();
        const fila = screen.getByRole("row", { name: /Tuerca/ });
        expect(within(fila).getByRole("alert")).toHaveTextContent("Escribe un precio mayor que 0");

        await user.type(screen.getByRole("spinbutton", { name: "Precio unitario de Tuerca" }), "2.5");
        expect(generar).toBeEnabled();
        await user.click(generar);

        expect(generadas[0]).toEqual({
            items: [
                { productId: "tornillo", quantity: 19, unitPrice: 3.25 },
                { productId: "tuerca", quantity: 4, unitPrice: 2.5 },
                { productId: "arandela", quantity: 8, unitPrice: 1 },
            ],
        });
    });

    it("una cantidad no entera bloquea el botón", async () => {
        const { user, generar } = pintar();

        const cantidad = screen.getByRole("spinbutton", { name: "Cantidad a pedir de Tornillo" });
        await user.clear(cantidad);
        await user.type(cantidad, "1.5");

        expect(generar).toBeDisabled();
        expect(screen.getByText("Un entero mayor que 0")).toBeInTheDocument();
    });

    it("sin nada marcado no se puede generar", async () => {
        const { user, generar } = pintar();

        await user.click(screen.getByRole("checkbox", { name: "Incluir Tornillo" }));
        await user.click(screen.getByRole("checkbox", { name: "Incluir Arandela" }));

        expect(generar).toBeDisabled();
        expect(screen.getByText("0 líneas marcadas")).toBeInTheDocument();
    });

    it("sin sugerencias lo dice, en vez de enseñar una tabla vacía", () => {
        filas = [];
        pintar();

        expect(screen.getByText(/No hay nada que reponer/)).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
});
