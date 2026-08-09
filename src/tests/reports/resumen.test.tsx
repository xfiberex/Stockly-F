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

    it("mientras carga no se pinta el informe", () => {
        cargando = true;
        renderWithProviders(<ReportsPage />);

        expect(screen.queryByRole("heading", { name: "Reportes", level: 1 })).not.toBeInTheDocument();
    });
});
