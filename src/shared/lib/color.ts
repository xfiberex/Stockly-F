/**
 * Elección de color de texto por contraste, según la fórmula de luminancia
 * relativa de la WCAG 2.1.
 *
 * Las etiquetas llevan un color libre elegido por el usuario: con texto blanco fijo,
 * cualquier color claro (un amarillo, por ejemplo) queda ilegible. Aquí se calcula
 * cuál de los dos extremos contrasta más con el fondo.
 */

const NEGRO = "#000000";
const BLANCO = "#ffffff";

/** `#abc` y `#aabbcc` → [r, g, b] en 0-255. Devuelve `undefined` si no es un hex válido. */
function aRgb(hex: string): [number, number, number] | undefined {
    const limpio = hex.trim().replace(/^#/, "");
    const completo =
        limpio.length === 3 ? limpio.split("").map((c) => c + c).join("")
        : limpio.length === 6 ? limpio
        : undefined;

    if (!completo || !/^[0-9a-f]{6}$/i.test(completo)) return undefined;

    return [
        parseInt(completo.slice(0, 2), 16),
        parseInt(completo.slice(2, 4), 16),
        parseInt(completo.slice(4, 6), 16),
    ];
}

/** Luminancia relativa WCAG: 0 = negro, 1 = blanco. */
export function luminanciaRelativa(hex: string): number {
    const rgb = aRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map((canal) => {
        const c = canal / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre dos colores: de 1 (idéntico) a 21 (negro/blanco). */
export function ratioContraste(colorA: string, colorB: string): number {
    const a = luminanciaRelativa(colorA);
    const b = luminanciaRelativa(colorB);
    const [claro, oscuro] = a > b ? [a, b] : [b, a];
    return (claro + 0.05) / (oscuro + 0.05);
}

/**
 * Color de texto legible sobre un fondo dado. Se usan negro y blanco puros a
 * propósito: con un gris oscuro en lugar de negro, el peor caso de fondo
 * (luminancia ≈ 0.2) se queda en 4.23 y no llega al mínimo de 4.5 de la WCAG.
 * Con estos dos, el peor caso posible es 4.58.
 */
export function textoLegibleSobre(fondo: string): typeof NEGRO | typeof BLANCO {
    return ratioContraste(fondo, NEGRO) >= ratioContraste(fondo, BLANCO) ? NEGRO : BLANCO;
}
