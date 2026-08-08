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

/**
 * Excepciones documentadas. Los gráficos de Recharts reciben colores como props
 * (`fill`, `stroke`), no como clases, así que no pueden usar utilidades; sus
 * paletas viven como hex en el propio componente. No son utilidades crudas y por
 * tanto no las detecta esta expresión — se listan aquí para dejar constancia de
 * que se revisaron.
 */
const EXCEPCIONES: string[] = [];

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
});
