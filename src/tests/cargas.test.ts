import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Cómo carga la interfaz (design-system.md §8): esqueleto para lo que tiene forma, spinner
 * para lo pequeño o lo que no la tiene. jsdom no evalúa CSS, así que lo del movimiento se
 * comprueba sobre la hoja de estilos, como en `movimiento.test.ts`.
 */

const RAIZ = join(__dirname, "..");
const css = readFileSync(join(RAIZ, "index.css"), "utf8");

/** El cuerpo de una regla o de un `@keyframes`, por su selector exacto. */
function bloque(selector: string): string {
    const inicio = css.indexOf(`${selector} {`);
    if (inicio === -1) return "";
    let profundidad = 0;
    for (let i = css.indexOf("{", inicio); i < css.length; i++) {
        if (css[i] === "{") profundidad++;
        else if (css[i] === "}" && --profundidad === 0) return css.slice(inicio, i + 1);
    }
    return "";
}

describe("El movimiento del esqueleto", () => {
    it("aparece a los 200 ms, con `animation-delay` y ocupando ya su sitio", () => {
        // `both`: antes del retraso aplica el `from` (opacidad 0) en vez de enseñarlo de golpe.
        expect(bloque(".esqueleto")).toMatch(/animation:\s*esqueleto-aparece\s+0\.01ms\s+linear\s+200ms\s+both/);
        expect(bloque("@keyframes esqueleto-aparece")).toMatch(/opacity:\s*0/);
    });

    it("late solo con `opacity`, que no repinta", () => {
        expect(bloque(".esqueleto-pulso")).toMatch(/animation:\s*esqueleto-pulso\s+[\d.]+s\s+ease-in-out\s+200ms\s+infinite/);
        const fotogramas = bloque("@keyframes esqueleto-pulso");
        const propiedades = [...fotogramas.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
        expect(propiedades.length).toBeGreaterThan(0);
        expect(new Set(propiedades)).toEqual(new Set(["opacity"]));
    });

    it("con movimiento reducido se queda quieto: no tiene excepción como el spinner", () => {
        const reducido = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
        expect(reducido).not.toMatch(/\.esqueleto/);
    });
});

function archivosTsx(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return entrada === "tests" ? [] : archivosTsx(ruta);
        return ruta.endsWith(".tsx") ? [ruta] : [];
    });
}

describe("Quién usa el spinner grande", () => {
    // Lo que no tiene forma que anticipar: una ruta que se descarga, la sesión que se comprueba,
    // un enlace de verificación, la cámara. Una pantalla de datos nueva va con esqueleto; si de
    // verdad no puede, se añade aquí con su porqué.
    const PERMITIDOS = [
        "routes/index.tsx",
        "shared/components/ProtectedRoute.tsx",
        "modules/auth/components/VerifyEmailPage.tsx",
        // AUD-014 — el enlace de restablecer se comprueba antes de enseñar el formulario.
        "modules/auth/components/ResetPasswordPage.tsx",
        "shared/components/EscanerModal.tsx",
    ];

    it("solo donde no hay forma que anticipar", () => {
        const usan = archivosTsx(RAIZ)
            .filter((f) => /<Spinner\s+size="lg"/.test(readFileSync(f, "utf8")))
            .map((f) => relative(RAIZ, f).split(sep).join("/"))
            .sort();
        expect(usan).toEqual([...PERMITIDOS].sort());
    });
});
