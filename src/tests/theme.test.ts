import { readFileSync } from "node:fs";
import path from "node:path";
import { ratioContraste } from "@/shared/lib/color";

// Se lee con `fs` y no con `?raw`: Vitest desactiva el procesado de CSS, así que
// una importación `?raw` de una hoja de estilos devuelve cadena vacía. La ruta sale
// del directorio del proyecto, que es desde donde se ejecuta Vitest.
const css = readFileSync(path.join(process.cwd(), "src/index.css"), "utf8");

// T2-35: los contrastes de la paleta no se anotan y ya está — se recalculan desde
// `index.css`. Cambiar un token a un valor que incumpla la WCAG rompe la suite.

function token(nombre: string): string {
    const match = new RegExp(`--${nombre}:\\s*([^;]+);`).exec(css);
    if (!match) throw new Error(`El token --${nombre} no está declarado en index.css`);
    return match[1].trim();
}

const SUPERFICIE = "#ffffff";

describe("Capa de tokens semánticos (T2-35)", () => {
    it("declara la paleta completa", () => {
        const esperados = [
            "color-background", "color-surface", "color-surface-muted", "color-border",
            "color-foreground", "color-foreground-muted",
            "color-primary", "color-accent", "color-accent-strong",
            "color-success", "color-warning", "color-danger", "color-info",
            "color-success-surface", "color-warning-surface", "color-danger-surface", "color-info-surface",
            "shadow-raised", "shadow-overlay", "ease-standard",
            "duration-fast", "duration-base",
        ];

        for (const nombre of esperados) {
            expect(() => token(nombre)).not.toThrow();
        }
    });

    // Mínimo AA para texto normal. Cada uno de estos colores se usa como texto o
    // como icono con texto al lado, sobre superficie blanca.
    it.each([
        ["color-foreground", 7],      // AAA
        ["color-foreground-muted", 4.5],
        ["color-primary", 7],         // AAA
        ["color-accent-strong", 4.5],
        ["color-success", 4.5],
        ["color-warning", 4.5],
        ["color-danger", 4.5],
        ["color-info", 4.5],
    ])("%s contrasta al menos %s:1 con la superficie", (nombre, minimo) => {
        expect(ratioContraste(token(nombre), SUPERFICIE)).toBeGreaterThanOrEqual(minimo as number);
    });

    // El acento suave es el caso que más se presta a un error silencioso.
    it("el acento suave sirve para bordes (≥ 3:1) pero no para texto (< 4.5:1)", () => {
        const ratio = ratioContraste(token("color-accent"), SUPERFICIE);

        expect(ratio).toBeGreaterThanOrEqual(3);
        // Si alguien «arregla» este valor sin mirar, el par accent/accent-strong
        // deja de tener sentido: por eso se afirma también el límite superior.
        expect(ratio).toBeLessThan(4.5);
    });

    it("cada estado contrasta con su propia superficie de badge", () => {
        for (const estado of ["success", "warning", "danger", "info"]) {
            const ratio = ratioContraste(token(`color-${estado}`), token(`color-${estado}-surface`));
            expect(ratio, `${estado} sobre su superficie`).toBeGreaterThanOrEqual(4.5);
        }
    });

    it("el texto principal contrasta con las tres superficies neutras", () => {
        for (const fondo of ["color-background", "color-surface", "color-surface-muted"]) {
            expect(ratioContraste(token("color-foreground"), token(fondo))).toBeGreaterThanOrEqual(7);
        }
    });

    // Precisión 1 de la tarea: redefinir los radios de Tailwind cambiaría de golpe
    // las 68 utilidades `rounded-*` ya escritas.
    it("no redefine los radios de Tailwind", () => {
        expect(css).not.toMatch(/--radius-[a-z]+:/);
    });
});
