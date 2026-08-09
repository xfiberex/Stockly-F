// T2-44: un solo formato de importe en toda la interfaz.
//
// Antes convivían dos: `toLocaleString("es-MX", …)` con separador de miles y
// `toFixed(2)` sin él, y llegaron a coincidir en la misma fila de reportes —«Precio
// unit.» salía `$14999.00` junto a un «Valor total» de `$1,234,567.89`—. Cada llamada
// además prefijaba su propio `$`, así que el símbolo tampoco estaba en un solo sitio.

const LOCALE = "es-MX";
const MONEDA = "MXN";

interface OpcionesImporte {
    /** Decimales fijos. 2 por defecto; 0 para un KPI que no necesita centavos. */
    decimales?: number;
    /** Antepone `+` a los positivos. Para variaciones, no para importes absolutos. */
    signo?: boolean;
}

/**
 * Formatea un importe en pesos: `$14,999.00`.
 *
 * Acepta el `string` que envía la API para los campos `Decimal` de Prisma, además de
 * un número. Un valor que no sea numérico devuelve `—`: es preferible un hueco visible
 * a un `$NaN` en una tabla de inventario.
 */
export function formatearImporte(valor: number | string, opciones: OpcionesImporte = {}): string {
    const { decimales = 2, signo = false } = opciones;
    const numero = typeof valor === "number" ? valor : Number(valor);

    if (!Number.isFinite(numero)) return "—";

    return new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: MONEDA,
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
        ...(signo && { signDisplay: "exceptZero" as const }),
    }).format(numero);
}
