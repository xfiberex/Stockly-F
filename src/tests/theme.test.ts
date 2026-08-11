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
//
// T4-11 cambia de dónde se leen: ya no hay dos bloques —uno claro y otro bajo una media
// query— sino una declaración por token con sus dos valores, `light-dark(claro, oscuro)`.

type Tema = "claro" | "oscuro";

const TEMAS: Tema[] = ["claro", "oscuro"];

/** El valor declarado de un token, tal cual, sin interpretar. */
function declaracion(nombre: string): string {
    const match = new RegExp(`--${nombre}:\\s*([^;]+);`).exec(css);
    if (!match) throw new Error(`El token --${nombre} no está declarado`);
    return match[1].trim();
}

/**
 * Los dos valores de un `light-dark()`. Se recorre buscando la coma **de nivel cero** en vez
 * de partir por la primera: los argumentos llevan paréntesis propios (`rgb(0 0 0 / 0.5)`) y
 * una expresión regular ingenua los troceaba por la mitad en cuanto alguien escribiera un
 * color con comas dentro.
 */
function parDeTemas(valor: string): [string, string] {
    const APERTURA = "light-dark(";
    const inicio = valor.indexOf(APERTURA);
    if (inicio < 0) throw new Error(`«${valor}» no declara los dos temas con light-dark()`);

    let profundidad = 0;
    let coma = -1;
    let i = inicio + APERTURA.length;

    for (; i < valor.length; i++) {
        const caracter = valor[i];
        if (caracter === "(") profundidad++;
        else if (caracter === ")") {
            if (profundidad === 0) break;
            profundidad--;
        } else if (caracter === "," && profundidad === 0) coma = i;
    }

    if (coma < 0) throw new Error(`«${valor}» declara un light-dark() con un solo valor`);
    return [valor.slice(inicio + APERTURA.length, coma).trim(), valor.slice(coma + 1, i).trim()];
}

/**
 * Valor de un token de color en un tema. Que los dos salgan de la **misma** declaración es
 * justo lo que hace imposible el fallo que la estructura anterior sí permitía: olvidarse de
 * un token en el bloque oscuro y que cayera en silencio al valor claro.
 */
function token(nombre: string, tema: Tema = "claro"): string {
    return parDeTemas(declaracion(nombre))[tema === "claro" ? 0 : 1];
}

describe("Capa de tokens semánticos (T2-35)", () => {
    it("declara la paleta completa", () => {
        const esperados = [
            "color-background", "color-surface", "color-surface-muted", "color-border",
            "color-foreground", "color-foreground-muted",
            "color-primary", "color-accent", "color-accent-strong",
            "color-success", "color-warning", "color-danger", "color-info",
            "color-success-surface", "color-warning-surface", "color-danger-surface", "color-info-surface",
            "color-chart-1", "color-chart-2", "color-chart-3", "color-chart-4",
            "color-chart-5", "color-chart-6", "color-chart-7", "color-chart-8",
            "color-chart-grid",
            "shadow-raised", "shadow-overlay", "ease-standard",
            "duration-fast", "duration-base",
        ];

        for (const nombre of esperados) {
            expect(() => declaracion(nombre), `--${nombre}`).not.toThrow();
        }
    });

    it("la paleta de gráficos se declara en un `@theme static`", () => {
        // No es una preferencia de estilo. Un `@theme` normal solo emite las variables cuyo
        // nombre Tailwind encuentra escrito en el código, y la paleta se construye por
        // plantilla en `shared/lib/grafico.ts`: de las ocho, solo salían al CSS compilado las
        // tres que además aparecen literales en un componente. Las otras cinco no llegaban a
        // declararse y Recharts pintaba las porciones en negro. El fallo era invisible desde
        // el CSS —los tokens están escritos ahí, con su comentario— y solo se veía en la
        // pantalla, así que se vigila desde aquí.
        const bloque = /@theme static\s*\{([^}]*)\}/.exec(css);

        expect(bloque, "no hay ningún bloque @theme static").not.toBeNull();
        for (let i = 1; i <= 8; i++) {
            expect(bloque![1], `--color-chart-${i}`).toContain(`--color-chart-${i}:`);
        }
        expect(bloque![1]).toContain("--color-chart-grid:");
    });

    // Precisión 1 de la tarea: redefinir los radios de Tailwind cambiaría de golpe
    // las 68 utilidades `rounded-*` ya escritas.
    it("no redefine los radios de Tailwind", () => {
        expect(css).not.toMatch(/--radius-[a-z]+:/);
    });
});

describe("Modo oscuro (T4-03) y elección de tema (T4-11)", () => {
    it("cada color de la capa semántica declara sus dos temas", () => {
        // Se recorren los tokens **realmente declarados**, no una lista escrita a mano, para
        // que un color nuevo entre solo en la comprobación. Un `--color-*` sin `light-dark()`
        // valdría lo mismo en los dos temas: en claro no se notaría y en oscuro sería una
        // isla luminosa.
        const declarados = [...css.matchAll(/^\s*--(color-[a-z0-9-]+):/gm)].map((m) => m[1]);

        expect(declarados.length).toBeGreaterThan(20);
        for (const nombre of declarados) {
            expect(() => parDeTemas(declaracion(nombre)), `--${nombre}`).not.toThrow();
        }
    });

    it("ningún tema se declara por media query", () => {
        // `prefers-color-scheme` fue el mecanismo de T4-03 y ya no lo es: un bloque así
        // **ignoraría la elección del usuario**, porque el selector de T4-11 conmuta
        // `color-scheme` y una media query mira la preferencia del sistema, no la nuestra.
        // Volver a meter uno rompería el tema manual sin romper nada visible en auto.
        // Se busca la **regla**, no la palabra: los comentarios de `index.css` explican
        // precisamente por qué ya no se usa, y prohibir el texto haría fallar la explicación.
        expect(css).not.toMatch(/@media[^{]*prefers-color-scheme/);
    });

    it("`color-scheme` es todo el conmutador: auto por defecto y dos anulaciones", () => {
        // Además de resolver los `light-dark()`, es lo que arrastra a los controles nativos
        // —barras de scroll, el desplegable de un `<select>`, el relleno automático—, que
        // ninguna hoja de estilos alcanza.
        expect(css).toMatch(/:root\s*\{\s*color-scheme:\s*light dark;\s*\}/);
        expect(css).toMatch(/:root\[data-tema="claro"\]\s*\{\s*color-scheme:\s*light;\s*\}/);
        expect(css).toMatch(/:root\[data-tema="oscuro"\]\s*\{\s*color-scheme:\s*dark;\s*\}/);
    });

    it("el `body` pinta el fondo, no solo el envoltorio de cada pantalla", () => {
        // Sin esto, lo que asoma al rebotar el desplazamiento —o mientras carga el primer
        // render— es el lienzo por defecto del navegador: blanco, y en tema oscuro se ve.
        expect(css).toMatch(/body\s*\{[^}]*background-color:\s*var\(--color-background\)/);
    });

    it("las sombras llevan los dos colores dentro del token", () => {
        // Esta comprobación nació equivocada y conviene que quede dicho: primero afirmaba
        // que un bloque oscuro redefiniera `--shadow-raised` / `--shadow-overlay`, pasaba en
        // verde… y la sombra seguía siendo azul translúcida en el navegador.
        //
        // El motivo es que Tailwind **no referencia** esos tokens al compilar: incrusta el
        // color literal en la utilidad (`--tw-shadow: 0 8px 24px var(--tw-shadow-color,
        // #0f172a1f)`), al revés que los colores, que sí salen como `var(--color-…)`. Como el
        // literal incrustado es el valor del token, la única forma de que la sombra cambie de
        // tema es que el par vaya **dentro**; redefinirla desde fuera no hace nada.
        for (const nombre of ["shadow-raised", "shadow-overlay"]) {
            const [claro, oscuro] = parDeTemas(declaracion(nombre));

            expect(claro, `${nombre} en claro`).toMatch(/^rgb\(15 23 42 \//);
            expect(oscuro, `${nombre} en oscuro`).toMatch(/^rgb\(0 0 0 \//);
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
