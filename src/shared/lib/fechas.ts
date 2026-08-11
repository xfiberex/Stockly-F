import { IDIOMA_POR_DEFECTO, type Idioma } from "@/shared/i18n/idioma";

/**
 * Fechas en el idioma de quien mira (T4-04).
 *
 * Una fecha no es una cadena traducible: nadie la escribe en el catálogo. Pero sí es texto
 * en pantalla, y `toLocaleDateString("es-MX", …)` deja «15 ago 2026» en mitad de una
 * interfaz en inglés — el mismo defecto que un literal sin extraer, solo que ninguna
 * guardia de literales lo vería, porque el idioma está en el argumento y no en el texto.
 *
 * Estaba repetido en cinco pantallas con tres juegos de opciones distintos, así que de
 * paso los formatos se unifican aquí: **corto** para las tablas y **con hora** para lo que
 * necesita el instante exacto —el detalle de un producto, el registro de auditoría—.
 *
 * El idioma se pasa siempre, nunca se lee del almacenamiento: estas funciones también las
 * llaman las exportaciones, y esas van fijas al idioma de referencia (ver `exportaciones`).
 */
const LOCALES: Record<Idioma, string> = {
    // Se conserva `es-MX` —no `es-ES`— porque es el que tenía la aplicación y el que
    // acompaña a la moneda: en `es-ES` la fecha corta sale «15 ago 2026» igual, pero el
    // separador de miles cambia y las dos cosas conviven en la misma fila de reportes.
    es: "es-MX",
    en: "en-US",
};

/**
 * El mismo mapa, expuesto para los ejes de los gráficos.
 *
 * Ahí las fechas se abrevian de otra forma —«15 ago» en una serie de stock, «ago 26» en
 * una de meses— y el formato lo elige cada gráfico, así que lo único que necesitan de
 * aquí es la localización. Se exporta el mapa en vez de una función por formato para no
 * acabar con cinco variantes de lo mismo.
 */
export const LOCALE_DE_GRAFICO = LOCALES;

const CORTO: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };

const CON_HORA: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
};

/** `15 ago 2026` / `Aug 15, 2026`. Para las tablas, donde la hora es ruido. */
export function formatearFecha(idioma: Idioma, iso: string): string {
    return new Date(iso).toLocaleDateString(LOCALES[idioma], CORTO);
}

/** Con hora y minuto, para cuando el instante importa (auditoría, detalle de producto). */
export function formatearFechaHora(idioma: Idioma, iso: string): string {
    return new Date(iso).toLocaleDateString(LOCALES[idioma], CON_HORA);
}

/**
 * El idioma de las **exportaciones**, que no es el de la pantalla.
 *
 * Un CSV es un formato de intercambio, no una vista: si dos personas exportan el mismo
 * informe y una lo tiene en inglés, las dos hojas no se pueden juntar. Las columnas y las
 * fechas salen siempre en el idioma de referencia, igual que hace `StockMovementsPage`
 * con los tipos de movimiento.
 */
export const IDIOMA_DE_EXPORTACION = IDIOMA_POR_DEFECTO;
