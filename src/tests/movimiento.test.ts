import { readFileSync } from "node:fs";
import { join } from "node:path";

// T2-12 — WCAG 2.3.3. La interfaz anima por todas partes (`transition-*`,
// `hover:scale-110`, `animate-spin`) y no había ni una coincidencia de
// `prefers-reduced-motion` en todo `src/`. Para quien tiene trastornos vestibulares
// eso no es un detalle estético.
//
// jsdom no evalúa CSS ni resuelve media queries, así que esto se comprueba sobre la
// hoja de estilos, no renderizando: es lo mismo que hace `theme.test.ts` con los
// contrastes. La comprobación de que el navegador lo respeta es de otra clase.

const css = readFileSync(join(__dirname, "..", "index.css"), "utf8");

/** El bloque `@media (prefers-reduced-motion: reduce) { … }`, con sus llaves anidadas. */
function bloqueDeMovimientoReducido(): string {
    const inicio = css.indexOf("@media (prefers-reduced-motion: reduce)");
    if (inicio === -1) return "";

    let profundidad = 0;
    for (let i = css.indexOf("{", inicio); i < css.length; i++) {
        if (css[i] === "{") profundidad++;
        else if (css[i] === "}" && --profundidad === 0) return css.slice(inicio, i + 1);
    }
    return "";
}

describe("Movimiento reducido (T2-12)", () => {
    const bloque = bloqueDeMovimientoReducido();

    it("existe la consulta de medios", () => {
        expect(bloque).not.toBe("");
    });

    it("acorta animaciones y transiciones, y desactiva el desplazamiento suave", () => {
        expect(bloque).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
        expect(bloque).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
        expect(bloque).toMatch(/scroll-behavior:\s*auto\s*!important/);
    });

    it("alcanza a todo, incluidos los pseudoelementos", () => {
        expect(bloque).toMatch(/\*::before/);
        expect(bloque).toMatch(/\*::after/);
    });

    it("las reglas llevan `!important`", () => {
        // Compiten con utilidades de Tailwind, que ganan por especificidad: sin
        // `!important` el bloque entero no haría nada.
        const declaraciones = bloque.match(/[a-z-]+:\s*[^;{]+;/g) ?? [];
        expect(declaraciones.length).toBeGreaterThan(0);
        expect(declaraciones.every((d) => d.includes("!important"))).toBe(true);
    });

    it("reduce el giro del spinner en vez de congelarlo", () => {
        // Un spinner quieto no comunica «esto sigue en marcha»; se le baja el ritmo.
        expect(bloque).toMatch(/\.animate-spin[\s\S]*animation-duration:\s*3s/);
        expect(bloque).toMatch(/\.animate-spin[\s\S]*animation-iteration-count:\s*infinite/);
    });

    it("no usa `animation: none`, que dejaría colgados los `transitionend`", () => {
        expect(bloque).not.toMatch(/animation:\s*none/);
        expect(bloque).not.toMatch(/transition:\s*none/);
    });
});
