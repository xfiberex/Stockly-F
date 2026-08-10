import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// T2-37: la interfaz nombra el papel del color, no su valor. Este test es la
// guardia: sin él, la próxima utilidad cruda entra sin que nadie se entere y
// vuelve a hacer imposible cambiar la paleta desde un sitio.

const SRC = path.join(process.cwd(), "src");

const FAMILIAS = [
    "slate", "gray", "zinc", "neutral", "stone",
    "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
    "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
].join("|");

const PREFIJOS = ["bg", "text", "border", "ring", "divide", "from", "to", "via", "placeholder", "fill", "stroke"].join("|");

const CRUDA = new RegExp(`\\b(?:${PREFIJOS})-(?:${FAMILIAS})-\\d{2,3}\\b`, "g");

const EXCEPCIONES: string[] = [];

/**
 * T4-03 — el agujero que esta guardia no veía.
 *
 * Recharts recibe los colores por props (`fill`, `stroke`, `contentStyle`), no por clases,
 * así que la expresión de arriba —que busca utilidades de Tailwind— nunca los detectó: eran
 * unos cuarenta hexadecimales sueltos en tres componentes, y con el modo oscuro se habrían
 * quedado en tonos de tema claro sobre un fondo oscuro. Ahora salen de `var(--color-…)`,
 * y esto vigila que no vuelvan.
 *
 * Los colores de **etiqueta** quedan fuera a propósito: los elige el usuario y se guardan
 * en la base de datos, así que son datos, no tema. Su legibilidad la resuelve
 * `textoLegibleSobre()`, que calcula el contraste contra el color real.
 */
const ARCHIVOS_DE_GRAFICO = [
    "src/modules/dashboard/components/DashboardPage.tsx",
    "src/modules/reports/components/ReportsPage.tsx",
    "src/modules/products/components/StockMovementsPage.tsx",
];

const HEX = /#[0-9a-fA-F]{6}\b/g;

function* archivos(dir: string): Generator<string> {
    for (const entrada of readdirSync(dir)) {
        const completo = path.join(dir, entrada);
        if (statSync(completo).isDirectory()) yield* archivos(completo);
        else if (/\.tsx?$/.test(entrada)) yield completo;
    }
}

describe("Utilidades de color crudas (T2-37)", () => {
    it("ningún archivo usa colores literales de la paleta de Tailwind", () => {
        const infracciones: string[] = [];

        for (const archivo of archivos(SRC)) {
            const relativo = path.relative(process.cwd(), archivo).replace(/\\/g, "/");
            if (EXCEPCIONES.includes(relativo)) continue;

            const encontradas = readFileSync(archivo, "utf8").match(CRUDA);
            if (encontradas) {
                infracciones.push(`${relativo}: ${[...new Set(encontradas)].join(", ")}`);
            }
        }

        expect(infracciones).toEqual([]);
    });

    it("los gráficos no llevan colores literales, que las clases no alcanzan (T4-03)", () => {
        const infracciones: string[] = [];

        for (const relativo of ARCHIVOS_DE_GRAFICO) {
            const encontrados = readFileSync(path.join(process.cwd(), relativo), "utf8").match(HEX);
            if (encontrados) infracciones.push(`${relativo}: ${[...new Set(encontrados)].join(", ")}`);
        }

        expect(infracciones).toEqual([]);
    });
});
