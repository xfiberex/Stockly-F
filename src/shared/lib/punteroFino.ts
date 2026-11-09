/**
 * AUD-014 — si hay ratón (o un panel táctil de portátil), no un dedo.
 *
 * Para decidir el `autoFocus` de un formulario: en el escritorio ahorra un clic, pero en un
 * móvil abre el teclado al llegar y tapa justo lo que la pantalla quería decir antes (los dos
 * pasos del registro, por ejemplo). Sin `matchMedia` —jsdom, un navegador muy viejo— se
 * supone escritorio, que es lo que había.
 */
export function hayPunteroFino(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return window.matchMedia("(pointer: fine)").matches;
}
