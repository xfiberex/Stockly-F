import type { Idioma } from "@/shared/i18n/idioma";

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
 * El idioma se pasa siempre, nunca se lee del almacenamiento.
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

/**
 * T5-09 — un **día de calendario** (`2026-03-01`), no un instante. `formatearFecha` no
 * sirve para esto: `new Date("2026-03-01")` es la medianoche UTC, y en un navegador al oeste
 * de Greenwich se pinta «28 feb». Aquí se fija `timeZone: "UTC"` en los dos lados, así que el
 * día que sale es el que se escribió, esté donde esté quien mira.
 */
export function formatearDia(idioma: Idioma, dia: string): string {
    return new Date(`${dia}T00:00:00Z`).toLocaleDateString(LOCALES[idioma], { ...CORTO, timeZone: "UTC" });
}

/**
 * T6-09 — el mismo día de calendario, en corto para el eje de un gráfico: `mié 30` / `30 Wed`.
 * Con `timeZone: "UTC"` por lo mismo que `formatearDia`.
 */
export function formatearDiaDeSemana(idioma: Idioma, dia: string): string {
    return new Date(`${dia}T00:00:00Z`).toLocaleDateString(LOCALES[idioma], { weekday: "short", day: "numeric", timeZone: "UTC" });
}

/** Con hora y minuto, para cuando el instante importa (auditoría, detalle de producto). */
export function formatearFechaHora(idioma: Idioma, iso: string): string {
    return new Date(iso).toLocaleDateString(LOCALES[idioma], CON_HORA);
}

/**
 * T5-12 — «hace 5 minutos», «ayer», «hace 3 días», para lo que acaba de pasar. A partir de una
 * semana deja de ser útil contar hacia atrás y se da la fecha.
 *
 * `numeric: "auto"` es lo que da «ahora» y «ayer» en vez de «hace 0 segundos» y «hace 1 día».
 * `ahora` se puede pasar para no depender del reloj en los tests.
 */
export function haceCuanto(idioma: Idioma, iso: string, ahora: number = Date.now()): string {
    const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
    const relativo = new Intl.RelativeTimeFormat(LOCALES[idioma], { numeric: "auto" });

    if (segundos < 60) return relativo.format(0, "second");
    if (segundos < 3600) return relativo.format(-Math.floor(segundos / 60), "minute");
    if (segundos < 86_400) return relativo.format(-Math.floor(segundos / 3600), "hour");
    if (segundos < 7 * 86_400) return relativo.format(-Math.floor(segundos / 86_400), "day");
    return formatearFecha(idioma, iso);
}
