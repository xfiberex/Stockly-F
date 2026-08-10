import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * T3-14 — la escala de radios y la de elevación, cerradas.
 *
 * Es la misma guardia que `tokens.test.ts` hace con los colores crudos, por la misma
 * razón: la convención de T2-35 solo dura lo que dure la memoria de quien la escribió. Sin
 * un test, el siguiente PR mete una `shadow-2xl` porque «se veía mejor» y la escala vuelve
 * a ser una colección de opiniones.
 *
 * Dos reglas, las dos del criterio de aceptación:
 *
 *   1. **Tres radios y ninguno más.** Superficies, controles y píldoras. El proyecto tenía
 *      un cuarto valor usado una sola vez, que no significaba nada distinto de los otros.
 *   2. **Dos elevaciones, ambas con nombre de papel.** `raised` para lo que se despega del
 *      fondo, `overlay` para lo que se pone por encima. Las utilidades de Tailwind
 *      (`sm`, `lg`, `xl`) nombran un tamaño, no un uso, y por eso se elegían a ojo: las
 *      once que había estaban repartidas entre tres tamaños sin criterio.
 *
 * Los patrones se componen a partir de trozos para que este archivo no contenga las clases
 * prohibidas escritas enteras — si no, el propio test sería su primera infracción.
 */

const SRC = path.join(process.cwd(), "src");

const RADIOS_PERMITIDOS = ["xl", "lg", "full"];
const ELEVACIONES_PERMITIDAS = ["raised", "overlay"];

// La mirada atrás `(?<!-)` distingue una **utilidad** de un fragmento de otro nombre: sin
// ella, `\b` casa dentro de `--tw-shadow-color` —el guion cuenta como límite de palabra— y
// el test acusaba a la propiedad CSS que T4-03 usa para oscurecer las sombras.
const RADIO = new RegExp(`(?<!-)\\b${"rounded"}-([a-z0-9]+)\\b`, "g");
const ELEVACION = new RegExp(`(?<!-)\\b${"shadow"}-([a-z0-9-]+)\\b`, "g");

function* archivos(dir: string): Generator<string> {
    for (const entrada of readdirSync(dir)) {
        const completo = path.join(dir, entrada);
        if (statSync(completo).isDirectory()) yield* archivos(completo);
        else if (/\.tsx?$/.test(entrada)) yield completo;
    }
}

function infracciones(patron: RegExp, permitidos: string[]): string[] {
    const fuera: string[] = [];

    for (const archivo of archivos(SRC)) {
        const relativo = path.relative(process.cwd(), archivo).replace(/\\/g, "/");
        // El propio test nombra los valores permitidos y prohibidos: excluirlo evita
        // que se acuse a sí mismo.
        if (relativo.endsWith("src/tests/elevacion.test.ts")) continue;

        const contenido = readFileSync(archivo, "utf8");
        for (const [completa, valor] of contenido.matchAll(patron)) {
            if (!permitidos.includes(valor!)) fuera.push(`${relativo}: ${completa}`);
        }
    }

    return [...new Set(fuera)];
}

describe("Escala de radios y elevación (T3-14)", () => {
    it("solo se usan los tres radios de la convención", () => {
        expect(infracciones(RADIO, RADIOS_PERMITIDOS)).toEqual([]);
    });

    it("cada sombra es uno de los dos tokens de elevación", () => {
        // Antes de T3-14 esto habría listado nueve infracciones: cinco tarjetas de
        // autenticación, la tarjeta del panel, el botón flotante, el modal y el menú
        // desplegable, repartidas entre tres tamaños de Tailwind.
        expect(infracciones(ELEVACION, ELEVACIONES_PERMITIDAS)).toEqual([]);
    });

    it("los dos tokens de elevación existen en el tema", () => {
        // Sin esto, la regla anterior se cumpliría también borrando las sombras: pasarían
        // los dos tests y no habría elevación ninguna.
        const css = readFileSync(path.join(SRC, "index.css"), "utf8");
        for (const nombre of ELEVACIONES_PERMITIDAS) {
            expect(css).toContain(`--shadow-${nombre}:`);
        }
    });
});
