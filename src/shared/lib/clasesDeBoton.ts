import { cn } from "@/shared/lib/cn";

export type VarianteBoton = "primary" | "secondary" | "danger" | "ghost";

// Tokens semánticos (T2-35), no valores. `--color-primary` es el color de acción
// primaria de la paleta; los rellenos con texto blanco encima usan siempre la
// variante fuerte de cada color, nunca el acento suave, que no llega a AA.
const VARIANTES: Record<VarianteBoton, string> = {
    primary: "bg-primary text-surface hover:bg-foreground disabled:bg-primary/40",
    secondary: "bg-surface-muted text-foreground hover:bg-border disabled:text-foreground-muted/50",
    danger: "bg-danger text-surface hover:bg-danger/90 disabled:bg-danger/40",
    ghost: "bg-transparent text-foreground-muted hover:bg-surface-muted disabled:text-foreground-muted/40",
};

// T2-40: el mismo componente en dos densidades, no dos componentes. Por debajo de `md`
// manda el mínimo táctil de 44 px —este botón es el de las acciones por fila y el de la
// paginación, que se pulsan con el pulgar—; de `md` en adelante vuelve a los 36 px del
// perfil denso, donde se apunta con ratón y la altura solo gasta espacio.
const BASE =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed md:min-h-9";

/**
 * Botón de solo icono: cuadrado, no una cápsula con `px-4`.
 *
 * Los tres de cada fila de órdenes —recibir, cancelar, eliminar— salían a 56 px de ancho
 * cada uno por el relleno horizontal del botón normal. A 412 px eso son 168 px de la fila
 * para tres iconos de 16, y lo que se quedaba sin sitio era el nombre del proveedor, que
 * se partía en seis líneas. Sin texto que acompañar, el relleno lateral no pinta nada;
 * el mínimo táctil lo sostiene `min-w-11`, que es la regla del sistema de diseño para los
 * controles cuadrados —cumplir de alto y fallar de ancho es el descuido habitual—.
 */
export const CLASES_BOTON_ICONO = "px-0 min-w-11 md:min-w-9";

/**
 * Las clases del botón, para lo que **no puede ser un `<button>`**.
 *
 * El caso que lo trajo (T2-14): una acción que navega tiene que ser un enlace, y un
 * `<button>` dentro de un `<a>` es HTML inválido. Con esto el enlace se ve igual sin
 * copiar la cadena de clases, que es como se separan dos cosas que deberían cambiar
 * juntas. No sirve para fabricar botones nuevos: para eso está el componente.
 *
 * Vive fuera de `Button.tsx` porque un archivo que exporta componentes no puede
 * exportar además funciones sin romper el *fast refresh* (`react-refresh`).
 */
export function clasesDeBoton(variante: VarianteBoton = "primary", className?: string) {
    return cn(BASE, VARIANTES[variante], className);
}
