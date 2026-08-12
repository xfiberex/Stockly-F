/**
 * El encabezado de una pantalla: título a un lado, acciones al otro.
 *
 * Las siete pantallas con acciones repetían la misma cadena de clases, y con ella el mismo
 * defecto en móvil. Medido a 412 px (Galaxy S20 Ultra): `flex items-center justify-between
 * flex-wrap` deja los botones en una fila suelta de anchos desiguales —«Exportar» e
 * «Importar» arriba y «Nuevo producto» solo, debajo—, porque cada uno mide lo que mide su
 * texto y el reparto lo decide la longitud de la palabra, no el diseño.
 *
 * Aquí viven las dos decisiones, una sola vez:
 *
 * 1. **Hasta `sm`, el título y las acciones se apilan.** A 412 px no caben en la misma
 *    línea sin que el título se parta en dos.
 * 2. **Las acciones van en una rejilla de dos columnas iguales**, no en un `flex-wrap`.
 *    Dos botones por fila, del mismo ancho, sin importar cuánto ocupe cada texto; el
 *    tercero, si lo hay, ocupa la fila siguiente entera. Los hijos se estiran solos porque
 *    en una celda de rejilla `justify-items` vale `stretch` — de ahí el `w-full` del
 *    disparador de `DropdownButton`, que no es un elemento de rejilla sino su hijo.
 *
 * De `sm` en adelante vuelve la fila de siempre, con cada botón midiendo lo suyo.
 */
export const CLASES_ENCABEZADO_DE_PAGINA =
    "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3";

export const CLASES_ACCIONES_DE_ENCABEZADO = [
    "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center",
    // Con un número impar de acciones, la última se queda sola en su fila ocupando media
    // pantalla y con un hueco al lado —tres botones en Productos: «Exportar», «Importar» y
    // un «Nuevo producto» descolgado—. Que ocupe la fila entera cierra la rejilla; de paso,
    // el botón principal, que suele ser el último, queda a ancho completo.
    "[&>*:last-child:nth-child(odd)]:col-span-2",
].join(" ");

/**
 * El envoltorio de una pantalla.
 *
 * `px-4` en móvil y `px-6` desde `sm`. Los 24 px de cada lado se comían 48 de los 412 que
 * tiene la pantalla, y esos 48 son justo los que le faltaban a `$2.211.974` para caber en
 * su tarjeta de KPI. En una pantalla ancha el respiro se agradece; en uno de teléfono es
 * espacio que no sobra.
 */
export const CLASES_CONTENEDOR_DE_PAGINA = "max-w-7xl mx-auto px-4 py-8 space-y-6 sm:px-6";
