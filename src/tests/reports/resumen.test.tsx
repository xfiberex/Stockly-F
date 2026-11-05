import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import DashboardPage from "@/modules/dashboard/components/DashboardPage";
import ReportsPage from "@/modules/reports/components/ReportsPage";
import type { ReportSummary } from "@/modules/reports/types/reports.types";
import { formatearDia } from "@/shared/lib/fechas";

// T2-21: las dos páginas estaban al 0 %, y son la primera pantalla tras el login y el
// informe que la amplía. Comparten el mismo endpoint (`useReports`), así que comparten
// también los datos de prueba: si el contrato cambia, fallan las dos a la vez.

const RESUMEN: ReportSummary = {
    totals: {
        totalProducts: 48,
        activeProducts: 45,
        inactiveProducts: 3,
        inventoryValue: 2211974.5,
        inventoryCostValue: 1400000,
        potentialMargin: 650000.25,
        productsWithoutCost: 3,
        lowStockCount: 2,
        // AUD-008 — las categorías del catálogo, no los grupos de `stockByCategory` (que aquí son 2).
        categoryCount: 5,
    },
    stockByCategory: [
        { name: "Electrónica", stock: 120, value: 1500000 },
        { name: "Oficina", stock: 60, value: 711974.5 },
    ],
    topByValue: [
        { id: "p1", name: "Laptop Asus", sku: "ELE-ASU-VB15", price: 14999, stock: 12, totalValue: 179988 },
        { id: "p2", name: "Tablet Apple", sku: null, price: 9999, stock: 18, totalValue: 179982 },
    ],
    movementsByMonth: [
        { month: "2026-07", type: "IN", total: 40 },
        { month: "2026-07", type: "OUT", total: 15 },
        { month: "2026-08", type: "OUT", total: 22 },
    ],
    lowStockProducts: [
        { id: "p3", name: "Teclado Logitech", sku: "OFI-LOG-K1", stock: 1, minStock: 5, category: "Oficina" },
        { id: "p4", name: "Monitor LG", sku: null, stock: 0, minStock: 3, category: null },
    ],
    stockMetrics: [
        {
            productId: "p3",
            productName: "Teclado Logitech",
            sku: "OFI-LOG-K1",
            totalOutLast30Days: 30,
            currentStock: 1,
            availableStock: 1,
            minStock: 5,
            dailyVelocity: 1,
            daysToStockout: 1,
            reorderSoon: true,
        },
    ],
    // T6-09 — siete días del negocio, dos con ventas y cinco a cero.
    salesByDay: [
        { day: "2026-09-24", orders: 0, revenue: 0 },
        { day: "2026-09-25", orders: 0, revenue: 0 },
        { day: "2026-09-26", orders: 0, revenue: 0 },
        { day: "2026-09-27", orders: 1, revenue: 250.5 },
        { day: "2026-09-28", orders: 0, revenue: 0 },
        { day: "2026-09-29", orders: 0, revenue: 0 },
        { day: "2026-09-30", orders: 2, revenue: 1300 },
    ],
    topSold: [
        { name: "Cable HDMI", units: 10, revenue: 100 },
        { name: "Teclado Logitech", units: 1, revenue: 450 },
    ],
    // T5-02 — con los casos que la interfaz tiene que saber enseñar: una categoría null,
    // un producto borrado (sin id) y un margen negativo.
    margin: {
        days: 30,
        revenue: 50000,
        cost: 35000,
        margin: 15000,
        marginPercent: 30,
        revenueWithoutCost: 4200,
        byCategory: [
            { name: "Electrónica", revenue: 40000, cost: 26000, margin: 14000, marginPercent: 35 },
            { name: null, revenue: 10000, cost: 9000, margin: 1000, marginPercent: 10 },
        ],
        topProducts: [
            { productId: "p8", name: "Portátil Lenovo", units: 3, revenue: 44997, cost: 30000, margin: 14997, marginPercent: 33.3 },
            { productId: null, name: "Producto retirado", units: 1, revenue: 500, cost: 400, margin: 100, marginPercent: 20 },
            { productId: "p9", name: "Cable en oferta", units: 10, revenue: 100, cost: 120, margin: -20, marginPercent: -20 },
        ],
    },
};

let resumen: ReportSummary | undefined = RESUMEN;
let cargando = false;
let fallo: unknown = null;
// Reintentando tras un fallo sin datos: TanStack v5 vuelve a `pending`, sin `error`, pero
// `errorUpdateCount` sigue contando el fallo (AUD-008, paso 8).
let reintentandoInforme = false;
const refetch = vi.fn();
const reintentar = vi.fn();
// 14:32 del 3 de noviembre de 2026, en la hora local de quien corre los tests.
const ACTUALIZADO = new Date(2026, 10, 3, 14, 32).getTime();

vi.mock("@/modules/reports/hooks/useReports", () => ({
    useReports: () => ({
        data: resumen,
        isLoading: cargando || reintentandoInforme,
        isError: fallo !== null && !reintentandoInforme,
        error: reintentandoInforme ? null : fallo,
        errorUpdateCount: fallo !== null || reintentandoInforme ? 1 : 0,
        refetch,
        isFetching: reintentandoInforme,
        dataUpdatedAt: ACTUALIZADO,
    }),
}));

// «Reintentar» vuelve a pedir todo lo que falló en la pantalla, no una consulta: se sustituye
// por una marca. `useFalloDeCarga` es el de verdad.
vi.mock("@/shared/hooks/useFalloDeCarga", async (original) => ({
    ...(await original<typeof import("@/shared/hooks/useFalloDeCarga")>()),
    useReintentarFallidas: () => reintentar,
}));

// El bloque «Necesita atención» pide tres listas más y lee el rol de la sesión. Se sustituyen
// por valores fijos: lo que se prueba aquí es lo que el panel pinta con ellos.
const listo = (valor: number | null) => ({ valor, cargando: false, error: false });
const ATENCION = {
    caducidades: listo(3),
    diasDeCaducidad: 30,
    unidadesCaducadas: 0,
    primerLote: undefined as undefined | { code: string; productName: string; expiresAt: string; expired: boolean },
    conteos: listo(1),
    compras: listo(0),
    ventas: listo(2),
};
let atencion = ATENCION;
let rol = "ADMIN";
const SIN_VENTAS = {
    hoy: "2026-11-05",
    ventas: [] as { id: string; number: number; status: string; total: string; createdAt: string }[],
    cantidad: 0,
    importe: 0,
    incompleto: false,
    cargando: false,
    error: null as unknown,
    reintentando: false,
};
let misVentas = SIN_VENTAS;

vi.mock("@/modules/dashboard/hooks/useAtencionDeHoy", () => ({
    useAtencionDeHoy: () => atencion,
}));
vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { role: rol, email: "vende@stockly.app" }, isLoading: false, isError: false }),
}));
vi.mock("@/modules/dashboard/hooks/useMisVentasDeHoy", () => ({
    useMisVentasDeHoy: () => misVentas,
}));

// Recharts mide su contenedor con ResizeObserver, que en jsdom no existe y siempre da
// 0×0: los gráficos no llegan a pintarse. Se sustituyen por una marca, porque lo que se
// prueba aquí son las cifras y los enlaces, no el SVG.
vi.mock("recharts", async () => {
    const React = await import("react");
    const grafico = (nombre: string) => {
        const Componente = ({ children }: { children?: React.ReactNode }) =>
            React.createElement("div", { "data-grafico": nombre }, children);
        Componente.displayName = nombre;
        return Componente;
    };

    // Se enumeran uno a uno en vez de con un `Proxy`: vitest comprueba que el mock
    // exporte de verdad lo que el módulo real exporta, y un `Proxy` no supera esa
    // comprobación —además de que, devolviendo algo para cualquier propiedad, atiende
    // también a `then`, con lo que el módulo se vuelve «thenable» y el `import()` se
    // queda esperando para siempre: la suite se cuelga sin dar un error.
    const nombres = [
        "ResponsiveContainer", "BarChart", "Bar", "AreaChart", "Area", "PieChart", "Pie",
        "Cell", "XAxis", "YAxis", "CartesianGrid", "Tooltip", "Legend",
    ];
    return Object.fromEntries(nombres.map((n) => [n, grafico(n)]));
});

describe("DashboardPage (T2-21)", () => {
    beforeEach(() => {
        resumen = RESUMEN;
        cargando = false;
        rol = "ADMIN";
    });

    it("pinta los tres recuentos del catálogo con sus cifras", () => {
        renderWithProviders(<DashboardPage />);

        const tarjeta = (etiqueta: string) => screen.getByText(etiqueta).closest("a")!;
        expect(within(tarjeta("Total de productos")).getByText("48")).toBeInTheDocument();
        expect(within(tarjeta("Productos activos")).getByText("45")).toBeInTheDocument();
        // AUD-008, paso 10 — las categorías del catálogo (`categoryCount`), no los grupos de
        // stock: esos incluyen «Sin categoría» y decían 12 donde había 11.
        expect(within(tarjeta("Categorías")).getByText("5")).toBeInTheDocument();
    });

    it("el stock bajo se dice una vez, en «Necesita atención», no en una tarjeta aparte (AUD-008)", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText("Stock bajo")).not.toBeInTheDocument();
        const fila = screen.getByText("Productos con stock bajo o agotado").closest("li")!;
        expect(within(fila).getByText("2")).toBeInTheDocument();
    });

    it("las cifras del catálogo no llevan color: no son estados (AUD-008)", () => {
        renderWithProviders(<DashboardPage />);

        const franja = screen.getByText("Total de productos").closest("a")!.parentElement!;
        expect(franja.innerHTML).not.toMatch(/\b(bg|text|border)-(info|success|warning|danger)\b/);
        expect(franja.innerHTML).not.toMatch(/shadow-/);
    });

    it("el valor del inventario usa el formato único de moneda (T2-44)", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("$2,211,974.50")).toBeInTheDocument();
    });

    it("da el valor a coste y a precio de venta, cada uno con su nombre (T5-02)", () => {
        renderWithProviders(<DashboardPage />);

        const valor = (nombre: string) => screen.getByText(nombre).nextElementSibling;
        expect(valor("Valor a coste")).toHaveTextContent("$1,400,000.00");
        expect(valor("Valor a precio de venta")).toHaveTextContent("$2,211,974.50");
        expect(valor("Margen potencial")).toHaveTextContent("$650,000.25");
    });

    it("el título está en español y el subtítulo solo dice de cuándo son los datos (AUD-008)", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByRole("heading", { level: 1, name: "Panel" })).toBeInTheDocument();
        expect(screen.queryByText(/Resumen general/)).not.toBeInTheDocument();
        expect(screen.getByText(/^Actualizado a las /)).toBeInTheDocument();
    });

    it("el margen potencial dice qué cuenta: no sale de restar las otras dos cifras (AUD-008)", () => {
        renderWithProviders(<DashboardPage />);

        const margen = screen.getByText("Margen potencial").parentElement!;
        expect(margen).toHaveTextContent("Venta menos coste, solo de los productos con coste");
        // Solo el margen lleva la aclaración: las otras dos cifras se entienden por su nombre.
        expect(screen.getAllByText(/solo de los productos con coste/)).toHaveLength(1);
    });

    it("avisa de los productos con stock que quedan fuera por no tener coste (T5-02)", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText(/3 productos con stock no tienen coste/)).toBeInTheDocument();
        // AUD-008, paso 10 — y lleva a la lista de esos productos, para ponerles coste.
        expect(screen.getByRole("link", { name: "Ver cuáles" })).toHaveAttribute("href", "/catalog/products?aviso=sinCoste");
    });

    it("sin productos sin coste no pinta el aviso (T5-02)", () => {
        resumen = { ...RESUMEN, totals: { ...RESUMEN.totals, productsWithoutCost: 0 } };
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText(/no tienen? coste/)).not.toBeInTheDocument();
    });

    it("cada KPI lleva a la sección que lo explica", () => {
        renderWithProviders(<DashboardPage />);

        // AUD-008, paso 9 — el total cuenta también los inactivos: su lista abre con «Todos».
        expect(screen.getByText("Total de productos").closest("a")).toHaveAttribute("href", "/catalog/products?activos=todos");
        expect(screen.getByText("Productos activos").closest("a")).toHaveAttribute("href", "/catalog/products");
        expect(screen.getByText("Categorías").closest("a")).toHaveAttribute("href", "/catalog/categories");
    });

    it("«Reponer primero» lista los productos afectados con su nivel de stock", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByRole("heading", { name: "Reponer primero" })).toBeInTheDocument();
        const teclado = screen.getByRole("link", { name: /Teclado Logitech/ });
        expect(teclado).toHaveAttribute("href", "/catalog/products/p3/movements");
        // El nivel va con el descriptor de `estados.ts`: agotado no es un «bajo» más.
        const fila = (nombre: RegExp) => screen.getByRole("link", { name: nombre }).closest("li")!;
        expect(within(fila(/Teclado Logitech/)).getByText("Bajo")).toBeInTheDocument();
        expect(within(fila(/Monitor LG/)).getByText("Agotado")).toBeInTheDocument();
    });

    it("un producto sin mínimo no dice «mín. 0»: dice que no lo tiene (AUD-008)", () => {
        resumen = {
            ...RESUMEN,
            lowStockProducts: [{ id: "p5", name: "Pilas", sku: null, stock: 0, minStock: 0, category: null }],
        };
        renderWithProviders(<DashboardPage />);

        const fila = screen.getByRole("link", { name: /Pilas/ }).closest("li")!;
        expect(fila).toHaveTextContent("0 uds. — sin mínimo");
        expect(fila).not.toHaveTextContent("mín. 0");
    });

    it("lo que pide actuar es la cifra más grande del panel (AUD-008)", () => {
        renderWithProviders(<DashboardPage />);

        const deAtencion = within(screen.getByText("Ventas por enviar").closest("li")!).getByText("2");
        expect(deAtencion).toHaveClass("text-2xl");
        expect(within(screen.getByText("Total de productos").closest("a")!).getByText("48")).toHaveClass("text-xl");
        expect(screen.getByText("Valor a coste").nextElementSibling).toHaveClass("text-xl");
    });

    it("sin productos en riesgo no hay lista de reposición, pero la fila sigue a cero", () => {
        resumen = { ...RESUMEN, totals: { ...RESUMEN.totals, lowStockCount: 0 }, lowStockProducts: [] };
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByRole("heading", { name: "Reponer primero" })).not.toBeInTheDocument();
        const fila = screen.getByText("Productos con stock bajo o agotado").closest("li")!;
        expect(within(fila).getByText("0")).toBeInTheDocument();
        expect(within(fila).queryByRole("link")).not.toBeInTheDocument();
    });

    it("mientras carga `/reports`, el resumen espera pero «Necesita atención» ya está (AUD-008)", () => {
        // Antes un esqueleto sustituía la página entera, y las cifras de atención —que no
        // dependen del informe— no empezaban a pedirse hasta que llegaba.
        cargando = true;
        resumen = undefined;
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText("Total de productos")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Necesita atención" })).toBeInTheDocument();
        expect(within(screen.getByText("Ventas por enviar").closest("li")!).getByText("2")).toBeInTheDocument();
        // La fila de stock sí sale del informe: todavía no tiene cifra.
        expect(within(screen.getByText("Productos con stock bajo o agotado").closest("li")!).queryByText(/\d/)).not.toBeInTheDocument();
    });
});

describe("DashboardPage — errores y frescura", () => {
    beforeEach(() => {
        resumen = RESUMEN;
        cargando = false;
        fallo = null;
        rol = "ADMIN";
        refetch.mockClear();
    });
    afterAll(() => {
        fallo = null;
    });

    it("dice a qué hora son los datos", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText(/^Actualizado a las /)).toHaveTextContent(/2:32|14:32/);
    });

    it("si la primera carga falla, no se queda en el esqueleto: lo dice y deja reintentar", async () => {
        resumen = undefined;
        fallo = new Error("Network Error");
        renderWithProviders(<DashboardPage />);

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el resumen del inventario");
        await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
        expect(reintentar).toHaveBeenCalled();
    });

    it("mientras reintenta, el aviso y su botón se quedan: el foco no se pierde (AUD-008)", () => {
        resumen = undefined;
        fallo = new Error("Network Error");
        reintentandoInforme = true;
        renderWithProviders(<DashboardPage />);
        reintentandoInforme = false;

        expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el resumen del inventario");
        const boton = screen.getByRole("button", { name: "Reintentar" });
        // Ocupado, pero no desactivado: un botón desactivado suelta el foco en `<body>`.
        expect(boton).toHaveAttribute("aria-busy", "true");
        expect(boton).not.toBeDisabled();
        expect(screen.getByRole("heading", { name: "Necesita atención" })).toBeInTheDocument();
    });

    it("si la primera carga falla, «Necesita atención» se queda y solo la fila de stock no está disponible", () => {
        resumen = undefined;
        fallo = new Error("Network Error");
        renderWithProviders(<DashboardPage />);

        expect(screen.getByRole("heading", { name: "Necesita atención" })).toBeInTheDocument();
        const fila = (etiqueta: string) => screen.getByText(etiqueta).closest("li")!;
        expect(within(fila("Productos con stock bajo o agotado")).getByText("No disponible")).toBeInTheDocument();
        expect(within(fila("Productos con stock bajo o agotado")).queryByRole("link")).not.toBeInTheDocument();
        // Las cifras que no salen de `/reports` siguen ahí, con su acción.
        expect(within(fila("Ventas por enviar")).getByText("2")).toBeInTheDocument();
        expect(within(fila("Ventas por enviar")).getByRole("link")).toHaveAttribute("href", "/sale-orders?estado=PENDING");
        // Lo que sí depende de `/reports` no se pinta a medias.
        expect(screen.queryByText("Total de productos")).not.toBeInTheDocument();
        expect(screen.queryByText(/Todo al día/)).not.toBeInTheDocument();
    });

    it("si falla una actualización, los datos se quedan y se avisa de que son los de antes", async () => {
        fallo = new Error("Network Error");
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Total de productos")).toBeInTheDocument();
        // El aviso va en una región `status`, para que el lector de pantalla lo anuncie, y sin
        // el doble punto de «p.m..»: en `es-MX` la hora ya trae el suyo.
        const aviso = screen.getByRole("status");
        expect(aviso).toHaveTextContent(/No se pudo actualizar: son los datos de las/);
        expect(aviso.textContent).not.toMatch(/\.\./);
        await userEvent.click(within(aviso).getByRole("button", { name: "Reintentar" }));
        expect(reintentar).toHaveBeenCalled();
    });

    it("con la actualización al día, la región de avisos está vacía: la hora no se anuncia", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByRole("status")).toBeEmptyDOMElement();
        expect(screen.getByText(/^Actualizado a las /)).toBeInTheDocument();
    });
});

describe("DashboardPage — necesita atención", () => {
    beforeEach(() => {
        resumen = RESUMEN;
        cargando = false;
        rol = "ADMIN";
        atencion = ATENCION;
    });

    const fila = (etiqueta: string) => screen.getByText(etiqueta).closest("li")!;

    it("va antes que las cifras del catálogo: lo primero es lo que pide actuar", () => {
        renderWithProviders(<DashboardPage />);

        const bloque = screen.getByRole("heading", { name: "Necesita atención" });
        const kpi = screen.getByText("Total de productos");
        expect(bloque.compareDocumentPosition(kpi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("cada fila con algo pendiente lleva su cifra y su acción", () => {
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Productos con stock bajo o agotado")).getByRole("link", { name: /Generar reposición/ }))
            .toHaveAttribute("href", "/purchase-orders/suggestions");
        expect(within(fila("Lotes caducados o por caducar")).getByText("3")).toBeInTheDocument();
        expect(within(fila("Lotes caducados o por caducar")).getByText("En los próximos 30 días")).toBeInTheDocument();
        expect(within(fila("Lotes caducados o por caducar")).getByRole("link", { name: /Ver caducidades/ }))
            .toHaveAttribute("href", "/expiry");
        // AUD-008, paso 9 — cada enlace llega a la lista ya filtrada por lo que cuenta su cifra.
        expect(within(fila("Ventas por enviar")).getByRole("link", { name: /Ver ventas/ }))
            .toHaveAttribute("href", "/sale-orders?estado=PENDING");
        expect(within(fila("Conteos abiertos")).getByRole("link", { name: /Ver conteos/ }))
            .toHaveAttribute("href", "/inventory-counts?estado=OPEN");
        expect(screen.getByRole("link", { name: /Teclado Logitech/ })).toHaveAttribute("title", "Teclado Logitech");
    });

    it("el nombre accesible de cada acción empieza por lo que dice su fila (WCAG 2.5.3)", () => {
        renderWithProviders(<DashboardPage />);

        // En móvil solo se ve la flecha, y la fila entera es el enlace.
        expect(within(fila("Ventas por enviar")).getByRole("link")).toHaveAccessibleName("2 Ventas por enviar: Ver ventas");
    });

    it("las compras por recibir llevan a la lista con ese filtro", () => {
        atencion = { ...ATENCION, compras: listo(4) };
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Compras por recibir")).getByRole("link")).toHaveAttribute("href", "/purchase-orders?estado=porRecibir");
    });

    it("nombra el lote que antes caduca, como la campana (AUD-008)", () => {
        atencion = {
            ...ATENCION,
            primerLote: { code: "L-20261030", productName: "Yogur natural", expiresAt: "2026-10-30", expired: true },
        };
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Lotes caducados o por caducar")).getByText(/Primero: L-20261030 de Yogur natural, caducó el/)).toBeInTheDocument();
    });

    it("una fila a cero se queda, sin acción", () => {
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Compras por recibir")).getByText("0")).toBeInTheDocument();
        expect(within(fila("Compras por recibir")).queryByRole("link")).not.toBeInTheDocument();
    });

    it("quien no es ADMIN no recibe un enlace a la reposición, que no puede abrir", () => {
        rol = "WAREHOUSE";
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Productos con stock bajo o agotado")).getByRole("link", { name: /Ver productos/ }))
            .toHaveAttribute("href", "/catalog/products?aviso=stockBajo");
    });

    it("con unidades ya caducadas lo dice en la fila", () => {
        atencion = { ...atencion, unidadesCaducadas: 12 };
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Lotes caducados o por caducar")).getByText("12 uds. ya caducadas")).toBeInTheDocument();
    });

    it("si una cifra no se pudo pedir, la fila lo dice en lugar de inventar un cero", () => {
        atencion = { ...atencion, ventas: { valor: null, cargando: false, error: true } };
        renderWithProviders(<DashboardPage />);

        expect(within(fila("Ventas por enviar")).getByText("No disponible")).toBeInTheDocument();
        expect(within(fila("Ventas por enviar")).queryByText("0")).not.toBeInTheDocument();
        // En tono de aviso: en gris se leía como una fila a cero.
        expect(within(fila("Ventas por enviar")).getByText("No disponible")).toHaveClass("text-warning");
    });

    it("con todo a cero lo dice arriba", () => {
        resumen = { ...RESUMEN, totals: { ...RESUMEN.totals, lowStockCount: 0 }, lowStockProducts: [] };
        atencion = { ...ATENCION, caducidades: listo(0), conteos: listo(0), ventas: listo(0) };
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Todo al día: no hay nada pendiente.")).toBeInTheDocument();
    });
});

describe("DashboardPage — un panel por rol", () => {
    beforeEach(() => {
        resumen = RESUMEN;
        cargando = false;
        atencion = ATENCION;
    });

    const filasDeAtencion = () =>
        within(screen.getByRole("heading", { name: "Necesita atención" }).closest("section")!)
            .getAllByRole("listitem")
            .map((li) => li.textContent);

    it("ADMIN ve las cinco filas y los importes del negocio, con el camino al informe", () => {
        rol = "ADMIN";
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Conteos abiertos")).toBeInTheDocument();
        expect(screen.getByText("Margen potencial")).toBeInTheDocument();
        expect(screen.getByText("Ventas de los últimos 7 días")).toBeInTheDocument();
        // AUD-008, paso 4: el gráfico por categoría se fue a Informes, que ya lo tenía; desde
        // el panel se llega por el enlace del bloque de importes.
        expect(screen.queryByText("Stock y valor por categoría")).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Ver reportes/ })).toHaveAttribute("href", "/reports");
        // El bloque de importes tiene su encabezado: la navegación por encabezados lo encuentra.
        expect(screen.getByRole("heading", { level: 2, name: "Valor del inventario" })).toBeInTheDocument();
    });

    it("USER ve lo pendiente de hoy: compras y ventas; el resumen del negocio está en Reportes (AUD-008)", () => {
        rol = "USER";
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Compras por recibir")).toBeInTheDocument();
        expect(screen.getByText("Ventas por enviar")).toBeInTheDocument();
        expect(screen.queryByText("Lotes caducados o por caducar")).not.toBeInTheDocument();
        expect(screen.queryByText("Margen potencial")).not.toBeInTheDocument();
        expect(screen.queryByText("Ventas de los últimos 7 días")).not.toBeInTheDocument();
        expect(screen.queryByText("Total de productos")).not.toBeInTheDocument();
    });

    it("WAREHOUSE ve caducidades y conteos, y nada de dinero ni de ventas", () => {
        rol = "WAREHOUSE";
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Lotes caducados o por caducar")).toBeInTheDocument();
        expect(screen.getByText("Conteos abiertos")).toBeInTheDocument();
        expect(screen.queryByText("Ventas por enviar")).not.toBeInTheDocument();
        expect(screen.queryByText("Valor a coste")).not.toBeInTheDocument();
        expect(screen.queryByText("Ventas de los últimos 7 días")).not.toBeInTheDocument();
        expect(screen.queryByText("Más vendidos")).not.toBeInTheDocument();
        expect(screen.queryByText("Total de productos")).not.toBeInTheDocument();
    });

    it("WAREHOUSE abre con sus acciones, la primera escanear (AUD-008)", () => {
        rol = "WAREHOUSE";
        renderWithProviders(<DashboardPage />);

        const almacen = screen.getByRole("region", { name: "En el almacén" });
        expect(within(almacen).getByRole("link", { name: "Escanear un producto" })).toHaveAttribute("href", "/catalog/products?escanear=1");
        expect(within(almacen).getByRole("link", { name: "Recibir compras" })).toHaveAttribute("href", "/purchase-orders?estado=porRecibir");
        // Antes que «Necesita atención».
        const atencionDeHoy = screen.getByRole("heading", { name: "Necesita atención" });
        expect(almacen.compareDocumentPosition(atencionDeHoy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("el orden de las filas es fijo, sea cual sea el rol", () => {
        rol = "WAREHOUSE";
        renderWithProviders(<DashboardPage />);

        const textos = filasDeAtencion().filter((t) => !t?.includes("uds. — "));
        expect(textos.map((t) => t!.replace(/[^A-Za-zÁ-ú ]/g, "").trim().split(" ")[0])).toEqual([
            "Productos",
            "Lotes",
            "Conteos",
            "Compras",
        ]);
    });

    describe("SELLER", () => {
        beforeEach(() => {
            rol = "SELLER";
            misVentas = SIN_VENTAS;
        });

        it("tiene su propio panel: el mostrador a un clic y ningún importe del negocio", () => {
            renderWithProviders(<DashboardPage />);

            expect(screen.getByRole("link", { name: "Ir al mostrador" })).toHaveAttribute("href", "/counter");
            expect(screen.queryByText("Necesita atención")).not.toBeInTheDocument();
            expect(screen.queryByText("Margen potencial")).not.toBeInTheDocument();
            expect(screen.queryByText("Total de productos")).not.toBeInTheDocument();
        });

        it("si sus ventas no se cargan, lo dice y deja reintentar", async () => {
            misVentas = { ...SIN_VENTAS, error: new Error("red") };
            renderWithProviders(<DashboardPage />);

            expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar tus ventas de hoy");
            await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
            expect(reintentar).toHaveBeenCalled();
        });

        it("sin ventas hoy lo dice", () => {
            renderWithProviders(<DashboardPage />);

            expect(screen.getByText("Todavía no has registrado ninguna venta hoy.")).toBeInTheDocument();
        });

        it("lista sus ventas con número e importe, y marca solo la excepción", () => {
            misVentas = {
                ...SIN_VENTAS,
                ventas: [
                    { id: "v1", number: 42, status: "SHIPPED", total: "349.00", createdAt: new Date(2026, 10, 5, 13, 26).toISOString() },
                    { id: "v2", number: 43, status: "CANCELLED", total: "20.00", createdAt: new Date().toISOString() },
                ],
                cantidad: 1,
                importe: 349,
            };
            renderWithProviders(<DashboardPage />);

            expect(screen.getByText("1 venta · $349.00")).toBeInTheDocument();
            const fila = (n: RegExp) => screen.getByText(n).closest("li")!;
            expect(within(fila(/Venta #0*42/)).queryByText("Enviado")).not.toBeInTheDocument();
            expect(within(fila(/Venta #0*43/)).getByText("Cancelado")).toBeInTheDocument();
            // AUD-008 — la hora del ticket, sin cero delante, y la venta se abre en Ventas,
            // desplegada, para reimprimir el comprobante.
            expect(fila(/Venta #0*42/)).toHaveTextContent(/1:26/);
            expect(screen.getByRole("link", { name: /Venta #0*42/ })).toHaveAttribute("href", "/sale-orders?numero=42&venta=v1");
        });

        it("«Verlas en Ventas» abre la lista con sus ventas de hoy (AUD-008)", () => {
            renderWithProviders(<DashboardPage />);

            expect(screen.getByRole("link", { name: /Verlas en Ventas/ })).toHaveAttribute(
                "href",
                "/sale-orders?mias=1&desde=2026-11-05&hasta=2026-11-05",
            );
        });

        it("si tiene más ventas de las que caben en una petición, lo dice", () => {
            misVentas = {
                ...SIN_VENTAS,
                ventas: [{ id: "v1", number: 42, status: "SHIPPED", total: "1.00", createdAt: new Date().toISOString() }],
                cantidad: 1,
                importe: 1,
                incompleto: true,
            };
            renderWithProviders(<DashboardPage />);

            expect(screen.getByText(/El resumen cuenta tus primeras 1 ventas de hoy/)).toBeInTheDocument();
        });
    });
});

describe("ReportsPage (T2-21)", () => {
    beforeEach(() => {
        resumen = RESUMEN;
        cargando = false;
    });

    it("muestra el resumen numérico del inventario", () => {
        renderWithProviders(<ReportsPage />);

        expect(screen.getByRole("heading", { name: "Reportes", level: 1 })).toBeInTheDocument();
        // El KPI de valor va sin centavos, a propósito (T2-44).
        expect(screen.getByText("$2,211,975")).toBeInTheDocument();
    });

    it("la tabla «Top por valor» usa el mismo formato en las dos columnas de importe", () => {
        renderWithProviders(<ReportsPage />);

        const fila = screen.getByText("Laptop Asus").closest("tr")!;
        // El defecto que arregló T2-44: aquí convivían `$14999.00` y `$179,988.00`.
        expect(within(fila).getByText("$14,999.00")).toBeInTheDocument();
        expect(within(fila).getByText("$179,988.00")).toBeInTheDocument();
    });

    it("un producto sin SKU no pinta una celda vacía con formato de código", () => {
        renderWithProviders(<ReportsPage />);

        const fila = screen.getByText("Tablet Apple").closest("tr")!;
        expect(within(fila).queryByText("ELE-ASU-VB15")).not.toBeInTheDocument();
    });

    it("lista los productos en riesgo con su stock y su mínimo", () => {
        renderWithProviders(<ReportsPage />);

        const fila = screen.getByText("Monitor LG").closest("tr")!;
        expect(within(fila).getByRole("link", { name: /Monitor LG/ })).toHaveAttribute(
            "href",
            "/catalog/products/p4/movements",
        );
    });

    describe("margen realizado (T5-02)", () => {
        it("pinta el total del periodo y la parte de las ventas que queda fuera", () => {
            renderWithProviders(<ReportsPage />);

            expect(screen.getByRole("heading", { name: "Margen realizado — últimos 30 días" })).toBeInTheDocument();
            expect(screen.getByText((texto) => texto.startsWith("Fuera del cálculo: $4,200.00 en ventas enviadas"))).toBeInTheDocument();
            const total = screen.getByText("Total").closest("tr")!;
            expect(within(total).getByText("$15,000.00")).toBeInTheDocument();
            expect(within(total).getByText("30.0 %")).toBeInTheDocument();
        });

        it("la categoría null se rotula en el idioma de la interfaz, no con un literal del servidor", () => {
            renderWithProviders(<ReportsPage />);

            const fila = screen.getByText("Sin categoría").closest("tr")!;
            expect(within(fila).getByText("$1,000.00")).toBeInTheDocument();
        });

        it("un producto borrado sale por su nombre pero sin enlace", () => {
            renderWithProviders(<ReportsPage />);

            expect(screen.getByText("Producto retirado")).toBeInTheDocument();
            expect(screen.queryByRole("link", { name: "Producto retirado" })).not.toBeInTheDocument();
            expect(screen.getByRole("link", { name: "Cable en oferta" })).toHaveAttribute("href", "/catalog/products/p9/movements");
        });

        it("un margen negativo lleva su signo, no solo el color", () => {
            renderWithProviders(<ReportsPage />);

            const fila = screen.getByRole("link", { name: "Cable en oferta" }).closest("tr")!;
            expect(within(fila).getByText("-$20.00")).toHaveClass("text-danger");
            expect(within(fila).getByText("-20.0 %")).toBeInTheDocument();
        });

        it("sin ventas con coste lo dice, y el porcentaje no es un 0 %", () => {
            resumen = {
                ...RESUMEN,
                margin: { ...RESUMEN.margin, revenue: 0, cost: 0, margin: 0, marginPercent: null, revenueWithoutCost: 0, byCategory: [], topProducts: [] },
            };
            renderWithProviders(<ReportsPage />);

            expect(screen.getByText("No hay ventas enviadas con coste conocido en los últimos 30 días.")).toBeInTheDocument();
            expect(screen.getByText("% margen realizado").previousElementSibling).toHaveTextContent("—");
        });
    });

    it("mientras carga no se pinta el informe", () => {
        cargando = true;
        renderWithProviders(<ReportsPage />);

        expect(screen.queryByRole("heading", { name: "Reportes", level: 1 })).not.toBeInTheDocument();
    });
});

describe("DashboardPage — ventas de la semana (T6-09)", () => {
    beforeEach(() => {
        resumen = RESUMEN;
        cargando = false;
        rol = "ADMIN";
    });

    const diasDeVentas = () =>
        within(screen.getByRole("list", { name: "Ventas enviadas por día" })).getAllByRole("listitem").map((li) => li.textContent);

    it("da los siete días, del más antiguo a hoy: dos con ventas y cinco a cero", () => {
        renderWithProviders(<DashboardPage />);

        const dia = (d: string) => formatearDia("es", d);
        // Un día sin ventas está, y a cero: no falta.
        expect(diasDeVentas()).toEqual([
            `${dia("2026-09-24")}: 0 ventas, $0.00`,
            `${dia("2026-09-25")}: 0 ventas, $0.00`,
            `${dia("2026-09-26")}: 0 ventas, $0.00`,
            `${dia("2026-09-27")}: 1 venta, $250.50`,
            `${dia("2026-09-28")}: 0 ventas, $0.00`,
            `${dia("2026-09-29")}: 0 ventas, $0.00`,
            `${dia("2026-09-30")}: 2 ventas, $1,300.00`,
        ]);
    });

    it("suma la semana encima del gráfico", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("3 ventas enviadas · $1,550.50")).toBeInTheDocument();
    });

    it("lista los más vendidos por unidades, con su importe", () => {
        renderWithProviders(<DashboardPage />);

        const lista = within(screen.getByRole("region", { name: "Más vendidos" })).getAllByRole("listitem");
        expect(lista.map((li) => li.textContent)).toEqual([
            "Cable HDMI10 uds. · $100.00",
            "Teclado Logitech1 ud. · $450.00",
        ]);
    });

    it("sin ventas en la semana lo dice, y siguen saliendo sus siete días", () => {
        resumen = {
            ...RESUMEN,
            salesByDay: RESUMEN.salesByDay.map((d) => ({ ...d, orders: 0, revenue: 0 })),
            topSold: [],
        };
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("0 ventas enviadas · $0.00")).toBeInTheDocument();
        expect(screen.getByText("Ninguna venta enviada en estos siete días.")).toBeInTheDocument();
        expect(diasDeVentas()).toHaveLength(7);
    });
});
