import { cn } from "@/shared/lib/cn";

/**
 * Clases de un ítem de menú desplegable: menú de usuario, Catálogo/Órdenes/Admin y el
 * de Exportar comparten esta forma.
 *
 * **Cada ítem es una caja delimitada.** El borde nace transparente y aparece al señalar
 * con el ratón o al llegar con el teclado, así que en reposo el panel sigue limpio y en
 * cuanto se apunta a una opción se ve **dónde empieza y dónde acaba**. El borde
 * transparente ocupa sitio desde el principio: si se añadiera solo en `hover`, el texto
 * bailaría un píxel al pasar por encima.
 *
 * `focus-visible` y no `focus`: quien navega con teclado ve el recuadro, y quien pulsa
 * con el ratón no se lo encuentra pegado después del clic.
 */
export function clasesDeItemDeMenu(className?: string) {
    return cn(
        "flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5",
        "text-left text-sm transition-colors md:min-h-9",
        "hover:border-border hover:bg-surface-muted",
        "focus-visible:border-border focus-visible:bg-surface-muted focus-visible:outline-none",
        className,
    );
}

/**
 * El panel que los contiene.
 *
 * Relleno por los cuatro lados —no solo arriba y abajo— porque, con los ítems
 * delimitados, un borde pegado al borde del panel se lee como un fallo de dibujo.
 *
 * Y **separación entre ítems** (`gap-1`, 4 px): apilados sin holgura, dos recuadros
 * contiguos comparten línea y parecen uno solapado con el siguiente. Cuando los ítems
 * no tenían borde no se notaba; en cuanto se delimitan, hace falta el aire.
 */
export const CLASES_PANEL_DE_MENU =
    "flex flex-col gap-1 rounded-xl border border-border bg-surface p-1 shadow-lg";
