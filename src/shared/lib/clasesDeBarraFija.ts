/**
 * AUD-013 — la acción principal de una pantalla de trabajo, pegada al borde de abajo en el móvil:
 * donde llega el pulgar y donde no la empuja la lista. Desde el ancho indicado vuelve a su sitio
 * en la página. La usan «Escanear» en el panel del almacén, «Guardar» en un conteo y el cobro del
 * mostrador.
 *
 * - `pb-[max(…, env(safe-area-inset-bottom))]`: en un iPhone sin botón, la barra del sistema
 *   tapa lo último de la pantalla.
 * - **Lo `fixed` no ocupa sitio:** el contenedor de la página tiene que reservar el hueco
 *   (`max-sm:pb-28`, `max-lg:pb-40`), o la barra se planta encima de lo último.
 * - Clases literales y no construidas: Tailwind lee el código como texto.
 */
export const CLASES_BARRA_FIJA_HASTA_SM =
    "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0";

/** Igual, hasta `lg`: el mostrador se usa también en una tableta, y ahí tampoco cabía el cobro. */
export const CLASES_BARRA_FIJA_HASTA_LG =
    "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0";
