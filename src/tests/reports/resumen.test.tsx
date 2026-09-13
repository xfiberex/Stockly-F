import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/tests/utils";
import DashboardPage from "@/modules/dashboard/components/DashboardPage";
import ReportsPage from "@/modules/reports/components/ReportsPage";
import type { ReportSummary } from "@/modules/reports/types/reports.types";

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
            minStock: 5,
            dailyVelocity: 1,
            daysToStockout: 1,
            reorderSoon: true,
        },
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

vi.mock("@/modules/reports/hooks/useReports", () => ({
    useReports: () => ({ data: resumen, isLoading: cargando }),
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
    });

    it("pinta las cuatro tarjetas de KPI con sus cifras", () => {
        renderWithProviders(<DashboardPage />);

        const tarjeta = (etiqueta: string) => screen.getByText(etiqueta).closest("a")!;
        expect(within(tarjeta("Total productos")).getByText("48")).toBeInTheDocument();
        expect(within(tarjeta("Productos activos")).getByText("45")).toBeInTheDocument();
        expect(within(tarjeta("Stock bajo")).getByText("2")).toBeInTheDocument();
        // «Categorías» no viene en `totals`: sale de la longitud de `stockByCategory`.
        expect(within(tarjeta("Categorías")).getByText("2")).toBeInTheDocument();
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

    it("avisa de los productos con stock que quedan fuera por no tener coste (T5-02)", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText(/3 productos con stock no tienen coste/)).toBeInTheDocument();
    });

    it("sin productos sin coste no pinta el aviso (T5-02)", () => {
        resumen = { ...RESUMEN, totals: { ...RESUMEN.totals, productsWithoutCost: 0 } };
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText(/no tienen? coste/)).not.toBeInTheDocument();
    });

    it("cada KPI lleva a la sección que lo explica", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("Total productos").closest("a")).toHaveAttribute("href", "/catalog/products");
        expect(screen.getByText("Stock bajo").closest("a")).toHaveAttribute("href", "/reports");
    });

    it("la alerta de stock bajo lista los productos afectados", () => {
        renderWithProviders(<DashboardPage />);

        expect(screen.getByText("2 productos con stock bajo o agotado")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /Teclado Logitech/ })).toHaveAttribute(
            "href",
            "/catalog/products/p3/movements",
        );
    });

    it("sin productos en riesgo, la alerta no se pinta", () => {
        resumen = { ...RESUMEN, totals: { ...RESUMEN.totals, lowStockCount: 0 }, lowStockProducts: [] };
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText(/stock bajo o agotado/)).not.toBeInTheDocument();
    });

    it("mientras carga no se pinta ninguna cifra", () => {
        cargando = true;
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText("Total productos")).not.toBeInTheDocument();
    });

    it("sin datos tampoco revienta: se queda en el estado de carga", () => {
        // `data` es `undefined` en el primer render y tras un error; el componente
        // comparte esa rama con la carga, y conviene que siga siendo así.
        cargando = false;
        resumen = undefined;
        renderWithProviders(<DashboardPage />);

        expect(screen.queryByText("Total productos")).not.toBeInTheDocument();
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
