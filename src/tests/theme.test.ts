import { readFileSync } from "node:fs";
import path from "node:path";
import { ratioContraste } from "@/shared/lib/color";

// Se lee con `fs` y no con `?raw`: Vitest desactiva el procesado de CSS, así que
// una importación `?raw` de una hoja de estilos devuelve cadena vacía. La ruta sale
// del directorio del proyecto, que es desde donde se ejecuta Vitest.
const css = readFileSync(path.join(process.cwd(), "src/index.css"), "utf8");

// T2-35: los contrastes de la paleta no se anotan y ya está — se recalculan desde
// `index.css`. Cambiar un token a un valor que incumpla la WCAG rompe la suite.
//
// T4-03 los recalcula **para los dos temas**. El criterio de aceptación del modo oscuro
// es literalmente ese: que la aplicación mantenga AA en claro y en oscuro, no que se vea
// oscura. Un tema nuevo que no cumpla no llega a `main`.

/** El bloque `@media (prefers-color-scheme: dark)`, donde se redefine la capa semántica. */
const bloqueOscuro = (() => {
    const inicio = css.indexOf("@media (prefers-color-scheme: dark)");
    if (inicio < 0) throw new Error("index.css no declara el bloque de modo oscuro");
    // Hasta el cierre del `:root` de dentro; basta con cortar en el siguiente `@media`
    // o en el final del archivo, porque el bloque oscuro es el único que redefine color.
    const siguiente = css.indexOf("@media", inicio + 1);
    return css.slice(inicio, siguiente < 0 ? undefined : siguiente);
})();

type Tema = "claro" | "oscuro";

/**
 * Valor de un token en un tema. El claro se lee del archivo entero —es donde vive
 * `@theme`— y el oscuro solo del bloque de la media query, de forma que un token que
 * alguien olvide redefinir ahí **no cae en silencio al valor claro**: falla.
 */
function token(nombre: string, tema: Tema = "claro"): string {
    const fuente = tema === "claro" ? css : bloqueOscuro;
    const match = new RegExp(`--${nombre}:\\s*([^;]+);`).exec(fuente);
    if (!match) throw new Error(`El token --${nombre} no está declarado en el tema ${tema}`);
    return match[1].trim();
}

const TEMAS: Tema[] = ["claro", "oscuro"];

describe("Capa de tokens semánticos (T2-35)", () => {
    it("declara la paleta completa", () => {
        const esperados = [
            "color-background", "color-surface", "color-surface-muted", "color-border",
            "color-foreground", "color-foreground-muted",
            "color-primary", "color-accent", "color-accent-strong",
            "color-success", "color-warning", "color-danger", "color-info",
            "color-success-surface", "color-warning-surface", "color-danger-surface", "color-info-surface",
            "color-chart-1", "color-chart-2", "color-chart-3", "color-chart-4",
            "color-chart-5", "color-chart-6", "color-chart-grid",
            "shadow-raised", "shadow-overlay", "ease-standard",
            "duration-fast", "duration-base",
        ];

        for (const nombre of esperados) {
            expect(() => token(nombre)).not.toThrow();
        }
    });

    // Precisión 1 de la tarea: redefinir los radios de Tailwind cambiaría de golpe
    // las 68 utilidades `rounded-*` ya escritas.
    it("no redefine los radios de Tailwind", () => {
        expect(css).not.toMatch(/--radius-[a-z]+:/);
    });
});

describe("Modo oscuro (T4-03)", () => {
    it("redefine todos los colores de la capa semántica, sin dejarse ninguno", () => {
        // Un token de color que no se redefina hereda el valor claro y aparece como una
        // isla luminosa. Se compara contra la lista real del `@theme`, no contra una
        // lista escrita a mano, para que un token nuevo entre en la comprobación solo.
        const bloqueClaro = css.slice(css.indexOf("@theme"), css.indexOf("@media"));
        const enClaro = [...bloqueClaro.matchAll(/--(color-[a-z0-9-]+):/g)].map((m) => m[1]);
        const enOscuro = new Set([...bloqueOscuro.matchAll(/--(color-[a-z0-9-]+):/g)].map((m) => m[1]));

        expect(enClaro.length).toBeGreaterThan(20);
        expect(enClaro.filter((t) => !enOscuro.has(t))).toEqual([]);
    });

    it("el `body` pinta el fondo, no solo el envoltorio de cada pantalla", () => {
        // Sin esto, lo que asoma al rebotar el desplazamiento —o mientras carga el primer
        // render— es el lienzo por defecto del navegador: blanco, y en tema oscuro se ve.
        expect(css).toMatch(/body\s*\{[^}]*background-color:\s*var\(--color-background\)/);
    });

    it("declara `color-scheme` para que los controles nativos acompañen", () => {
        // Sin esto, las barras de scroll y el desplegable de un `<select>` se quedan
        // claros: son piezas del navegador que ninguna hoja de estilos alcanza.
        expect(css).toMatch(/color-scheme:\s*light dark/);
    });

    it("las sombras se oscurecen por `--tw-shadow-color`, no por el token", () => {
        // Esta comprobación nació equivocada y conviene que quede dicho: primero afirmaba
        // que el bloque oscuro redefiniera `--shadow-raised` / `--shadow-overlay`, pasaba
        // en verde… y la sombra seguía siendo azul translúcida en el navegador.
        //
        // El motivo es que Tailwind **no referencia** esos tokens al compilar: incrusta el
        // color literal en la utilidad (`--tw-shadow: 0 8px 24px var(--tw-shadow-color,
        // #0f172a1f)`), al revés que los colores, que sí salen como `var(--color-…)`. Así
        // que redefinir el token no hace nada y el test lo daba por bueno igualmente.
        //
        // Lo que se afirma ahora es el mecanismo que sí funciona.
        expect(css).not.toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?--shadow-(raised|overlay):/);

        for (const utilidad of ["shadow-raised", "shadow-overlay"]) {
            expect(css, `${utilidad} en oscuro`).toMatch(
                new RegExp(`\\.${utilidad}\\s*\\{[^}]*--tw-shadow-color:\\s*rgb\\(0 0 0`),
            );
        }
    });

    it("no es la paleta clara invertida: los estados se aclaran", () => {
        // Invertir daría un rojo casi negro. La regla es aclarar y desaturar, y se
        // comprueba por luminancia: en oscuro cada estado debe ser **más claro** que su
        // equivalente en el tema claro.
        for (const estado of ["success", "warning", "danger", "info"]) {
            const claro = ratioContraste(token(`color-${estado}`, "claro"), "#000000");
            const oscuro = ratioContraste(token(`color-${estado}`, "oscuro"), "#000000");
            expect(oscuro, `${estado} en oscuro debe ser más claro que en claro`).toBeGreaterThan(claro);
        }
    });
});

describe.each(TEMAS)("Contraste WCAG — tema %s", (tema) => {
    const superficie = () => token("color-surface", tema);

    // Mínimo AA para texto normal. Cada uno de estos colores se usa como texto o
    // como icono con texto al lado, sobre la superficie de tarjeta.
    it.each([
        ["color-foreground", 7],      // AAA
        ["color-foreground-muted", 4.5],
        ["color-accent-strong", 4.5],
        ["color-success", 4.5],
        ["color-warning", 4.5],
        ["color-danger", 4.5],
        ["color-info", 4.5],
    ])("%s contrasta al menos %s:1 con la superficie", (nombre, minimo) => {
        expect(ratioContraste(token(nombre, tema), superficie())).toBeGreaterThanOrEqual(minimo as number);
    });

    it("el texto principal contrasta con las tres superficies neutras", () => {
        for (const fondo of ["color-background", "color-surface", "color-surface-muted"]) {
            expect(
                ratioContraste(token("color-foreground", tema), token(fondo, tema)),
                `foreground sobre ${fondo}`,
            ).toBeGreaterThanOrEqual(7);
        }
    });

    it("cada estado contrasta con su propia superficie de badge", () => {
        for (const estado of ["success", "warning", "danger", "info"]) {
            const ratio = ratioContraste(token(`color-${estado}`, tema), token(`color-${estado}-surface`, tema));
            expect(ratio, `${estado} sobre su superficie`).toBeGreaterThanOrEqual(4.5);
        }
    });

    /**
     * Los rellenos llevan **`text-surface`** encima, nunca `text-white` —que no aparece
     * ni una vez en `src/`—. Por eso el par se invierte solo al cambiar de tema, y por eso
     * lo que hay que comprobar es el contraste del relleno contra la superficie: en claro
     * es un relleno oscuro con texto blanco, en oscuro uno claro con texto oscuro.
     */
    it.each([
        ["color-primary", "botón primario"],
        ["color-foreground", "botón primario en hover"],
        ["color-danger", "botón destructivo"],
    ])("%s sirve de relleno con `text-surface` encima (%s)", (nombre) => {
        expect(ratioContraste(token(nombre, tema), superficie())).toBeGreaterThanOrEqual(4.5);
    });

    it("el acento llega al mínimo de componente no textual (3:1)", () => {
        expect(ratioContraste(token("color-accent", tema), superficie())).toBeGreaterThanOrEqual(3);
    });

    it("el borde se distingue de la superficie que delimita", () => {
        // Calibrado contra el propio tema claro, que da 1.23:1, en vez de contra un
        // número inventado: es el listón que el proyecto ya aceptaba.
        expect(ratioContraste(token("color-border", tema), superficie())).toBeGreaterThanOrEqual(1.2);
    });

    it("la tarjeta se despega del fondo de página", () => {
        expect(ratioContraste(superficie(), token("color-background", tema))).toBeGreaterThan(1.03);
    });
});

describe("Asimetría del acento entre temas", () => {
    // En claro, el par accent/accent-strong existe porque el suave **no llega** a 4.5 y
    // por eso no puede llevar texto encima. En oscuro esa tensión desaparece: sobre un
    // fondo oscuro el mismo verde da 6.7:1. Se afirma cada cosa donde es cierta, en vez
    // de forzar la paleta oscura para que cumpla una restricción que allí no aplica.
    it("en claro el acento suave no sirve para texto (< 4.5:1)", () => {
        const ratio = ratioContraste(token("color-accent", "claro"), token("color-surface", "claro"));

        expect(ratio).toBeGreaterThanOrEqual(3);
        expect(ratio).toBeLessThan(4.5);
    });

    it("en oscuro sí lo supera, y no es un defecto", () => {
        const ratio = ratioContraste(token("color-accent", "oscuro"), token("color-surface", "oscuro"));

        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
});
