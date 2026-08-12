/**
 * Una tabla, dos piezas: el contenedor que se desplaza y la tabla que lo obliga.
 *
 * **Las dos hacen falta, y por eso están juntas.** Un `overflow-x-auto` sobre una tabla
 * `w-full` no desplaza nada: la tabla cabe siempre porque encoge, y lo que pasa es que las
 * columnas se estrujan hasta partir el texto por sílabas. El desplazamiento aparece cuando
 * la tabla tiene un ancho mínimo mayor que su contenedor, que es lo que pone `min-w-160`
 * —640 px, con sitio para cinco o seis columnas—. En escritorio manda `w-full` y el ancho
 * mínimo no se nota.
 *
 * El fallo que esto arregla era el contrario y más silencioso: media docena de tablas
 * vivían dentro de una tarjeta con `overflow-hidden` —puesto para recortar las esquinas
 * redondeadas— que **anula el desplazamiento**. No es que la barra no se viera: es que no
 * había forma de llegar a las columnas de la derecha. La tarjeta conserva su
 * `overflow-hidden` y el desplazador va **dentro**, que es lo que deja las dos cosas.
 *
 * `contain-paint` no es decoración: en Chrome de Android un contenedor con desplazamiento
 * horizontal ensancha el *viewport de diseño* y los modales `position: fixed` acaban
 * midiendo más que la pantalla (T2-45). `sin-barra` oculta la barra sin quitar el
 * desplazamiento; el porqué, en `index.css`.
 *
 * Lo vigila `src/tests/desbordes.test.ts`.
 */
export const CLASES_TABLA_DESPLAZABLE = "overflow-x-auto contain-paint sin-barra";

/** La tabla de dentro. El ancho mínimo es lo que provoca el desplazamiento en móvil. */
export const CLASES_TABLA = "w-full min-w-160 text-sm";
