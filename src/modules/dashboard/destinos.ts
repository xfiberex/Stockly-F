/**
 * AUD-008, paso 9 — adónde lleva cada fila: a la lista **ya filtrada** por lo que cuenta la
 * cifra. Antes «4 · Ventas por enviar» abría las 28 órdenes, y había que volver a filtrar a mano.
 * Las listas leen estos parámetros al abrirse.
 */
export const DESTINOS = {
    stockBajo: "/catalog/products?aviso=stockBajo",
    caducidades: "/expiry",
    conteos: "/inventory-counts?estado=OPEN",
    compras: "/purchase-orders?estado=porRecibir",
    ventas: "/sale-orders?estado=PENDING",
} as const;
