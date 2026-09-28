import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import InformePorPeriodoPage from "@/modules/reports/components/InformePorPeriodoPage";
import type { ConsultaDePeriodo } from "@/modules/reports/api/reports.api";
import type { InformePorPeriodo } from "@/shared/contratos";

/**
 * T5-09 — la pantalla de ventas y compras por periodo.
 *
 * El periodo lo resuelve el backend en la zona del negocio, así que aquí se vigila sobre todo lo
 * que la pantalla **no** debe decidir por su cuenta: el rango que enseña es el que llegó, y los
 * días se pintan como días, no como instantes que el huso del navegador puede correr uno atrás.
 */

const cero = { salesUnits: 0, salesRevenue: 0, purchaseUnits: 0, purchaseAmount: 0 };

const INFORME: InformePorPeriodo = {
    from: "2026-03-01",
    to: "2026-03-31",
    preset: "this-month",
    timezone: "America/Santo_Domingo",
    totals: { salesOrders: 3, salesUnits: 7, salesRevenue: 216.46, purchaseOrders: 1, purchaseUnits: 50, purchaseAmount: 412.5 },
    byMonth: [{ month: "2026-03", salesUnits: 7, salesRevenue: 216.46, purchaseUnits: 50, purchaseAmount: 412.5 }],
    byCategory: [
        { name: "Periféricos", salesUnits: 4, salesRevenue: 79.96, purchaseUnits: 50, purchaseAmount: 412.5 },
        { name: null, salesUnits: 3, salesRevenue: 136.5, purchaseUnits: 0, purchaseAmount: 0 },
    ],
    byProduct: [
        { productId: "a", name: "Auriculares", sku: "AUR-1", category: "Periféricos", salesUnits: 4, salesRevenue: 79.96, purchaseUnits: 50, purchaseAmount: 412.5 },
        { productId: null, name: "Instalación", sku: null, category: null, salesUnits: 3, salesRevenue: 136.5, purchaseUnits: 0, purchaseAmount: 0 },
    ],
    moreProducts: false,
};

let informe: InformePorPeriodo = INFORME;
const consultas: ConsultaDePeriodo[] = [];
const descargas: unknown[][] = [];

vi.mock("@/modules/reports/hooks/useReports", () => ({
    usePeriodReport: (consulta: ConsultaDePeriodo) => {
        consultas.push(consulta);
        return { data: informe, isLoading: false };
    },
}));

vi.mock("@/modules/reports/api/reports.api", () => ({
    downloadPeriodReport: (...args: unknown[]) => descargas.push(args),
}));

const ultimaConsulta = () => consultas[consultas.length - 1];

describe("Ventas y compras por periodo (T5-09)", () => {
    const tzOriginal = process.env.TZ;

    beforeAll(() => {
        // Al oeste de Greenwich: `new Date("2026-03-01")` es aquí el 28 de febrero por la
        // tarde, que es justo el error que el formateador de días tiene que evitar.
        process.env.TZ = "America/Santo_Domingo";
    });

    afterAll(() => {
        process.env.TZ = tzOriginal;
    });

    beforeEach(() => {
        informe = INFORME;
        consultas.length = 0;
        descargas.length = 0;
    });

    it("abre en este mes y enseña el rango que resolvió el backend, sin correr los días", () => {
        renderWithProviders(<InformePorPeriodoPage />);

        expect(ultimaConsulta()).toEqual({ preset: "this-month" });
        expect(screen.getByRole("button", { name: "Este mes" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByText("Del 01 mar 2026 al 31 mar 2026 · zona horaria America/Santo_Domingo")).toBeInTheDocument();
    });

    it("un atajo pide ese atajo, no unas fechas calculadas aquí", async () => {
        const user = userEvent.setup();
        renderWithProviders(<InformePorPeriodoPage />);

        await user.click(screen.getByRole("button", { name: "Mes anterior" }));

        expect(ultimaConsulta()).toEqual({ preset: "last-month" });
        expect(screen.getByRole("button", { name: "Mes anterior" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Este mes" })).toHaveAttribute("aria-pressed", "false");
    });

    it("un rango con el fin antes del inicio no se pide; uno válido, sí", async () => {
        const user = userEvent.setup();
        renderWithProviders(<InformePorPeriodoPage />);

        fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-04-10" } });
        fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-04-01" } });
        await user.click(screen.getByRole("button", { name: "Aplicar" }));

        expect(screen.getByText("La fecha final no puede ser anterior a la inicial")).toBeInTheDocument();
        expect(ultimaConsulta()).toEqual({ preset: "this-month" });

        fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-05-20" } });
        await user.click(screen.getByRole("button", { name: "Aplicar" }));

        expect(ultimaConsulta()).toEqual({ from: "2026-04-10", to: "2026-05-20" });
        expect(screen.queryByText("La fecha final no puede ser anterior a la inicial")).not.toBeInTheDocument();
        // Ya no hay atajo activo.
        expect(screen.getByRole("button", { name: "Este mes" })).toHaveAttribute("aria-pressed", "false");
    });

    it("pinta totales, meses con su total, y lo que no tiene categoría con su rótulo", () => {
        renderWithProviders(<InformePorPeriodoPage />);

        expect(screen.getByText("Órdenes enviadas").previousSibling).toHaveTextContent("3");
        expect(screen.getByText("Unidades compradas").previousSibling).toHaveTextContent("50");

        const porMes = screen.getByRole("heading", { name: "Por mes" }).closest("section")!;
        expect(within(porMes).getByRole("row", { name: /^Marzo de 2026/ })).toBeInTheDocument();
        expect(within(porMes).getByRole("rowheader", { name: "Total" })).toBeInTheDocument();

        const porCategoria = screen.getByRole("heading", { name: "Por categoría" }).closest("section")!;
        expect(within(porCategoria).getByRole("cell", { name: "Sin categoría" })).toBeInTheDocument();

        // Sin más productos que los enseñados, no se avisa de nada.
        expect(screen.queryByText(/El CSV los trae todos/)).not.toBeInTheDocument();
    });

    it("si hay más productos de los que se enseñan, lo dice", () => {
        informe = { ...INFORME, moreProducts: true };
        renderWithProviders(<InformePorPeriodoPage />);

        expect(screen.getByText("Los 2 primeros por ventas. El CSV los trae todos.")).toBeInTheDocument();
    });

    it("sin ventas ni compras, lo dice en vez de pintar tablas vacías", () => {
        informe = {
            ...INFORME,
            totals: { salesOrders: 0, purchaseOrders: 0, ...cero },
            byMonth: [{ month: "2026-03", ...cero }],
            byCategory: [],
            byProduct: [],
        };
        renderWithProviders(<InformePorPeriodoPage />);

        expect(screen.getByText("No hay ventas enviadas ni compras recibidas en este periodo.")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Por mes" })).not.toBeInTheDocument();
    });

    it("exporta el periodo resuelto, no el atajo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<InformePorPeriodoPage />);

        await user.click(screen.getByRole("button", { name: "Exportar CSV" }));
        await user.click(screen.getByRole("button", { name: "Descargar PDF" }));

        expect(descargas).toEqual([
            [INFORME, "csv"],
            [INFORME, "pdf"],
        ]);
    });
});
