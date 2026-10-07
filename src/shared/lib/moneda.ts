// T2-44: un solo formato de importe en toda la interfaz.
//
// Antes convivían dos: `toLocaleString("es-MX", …)` con separador de miles y
// `toFixed(2)` sin él, y llegaron a coincidir en la misma fila de reportes —«Precio
// unit.» salía `$14999.00` junto a un «Valor total» de `$1,234,567.89`—. Cada llamada
// además prefijaba su propio `$`, así que el símbolo tampoco estaba en un solo sitio.
//
// T6-03: el símbolo ya no es una constante, es un ajuste del negocio. El formato sigue
// siendo uno solo y ahora es el mismo que el del backend: `escribirImporte`, en el contrato.

import { SIMBOLO_DE_MONEDA_POR_DEFECTO, escribirImporte, motivoSimboloDeMonedaInvalido } from "@/shared/contratos";

/**
 * El símbolo de la moneda del negocio, **fuera de React a propósito**.
 *
 * `formatearImporte` la llaman una docena de componentes, además de los `tickFormatter` de los
 * gráficos y algún test, y es una función pura: convertirla en un hook obligaría a reescribir
 * cada llamada. Así que el símbolo vive aquí, lo fija `useNegocio` al recibirlo del servidor
 * y `ProtectedRoute` no pinta ninguna pantalla hasta que ha llegado: el primer importe que se
 * ve ya sale con la moneda buena.
 */
let simbolo: string = SIMBOLO_DE_MONEDA_POR_DEFECTO;
const oyentes = new Set<() => void>();

/** El símbolo en vigor. Es el `getSnapshot` de `useSimboloDeMoneda`. */
export function simboloDeMoneda(): string {
    return simbolo;
}

/**
 * Cambia el símbolo y avisa a quien esté suscrito. Uno que no pase la regla del contrato deja
 * el de por defecto: es preferible un `$` a un importe sin moneda.
 */
export function fijarSimboloDeMoneda(nuevo: string): void {
    const valido = motivoSimboloDeMonedaInvalido(nuevo) === null ? nuevo : SIMBOLO_DE_MONEDA_POR_DEFECTO;
    if (valido === simbolo) return;
    simbolo = valido;
    oyentes.forEach((avisar) => avisar());
}

/** El `subscribe` de `useSimboloDeMoneda`. */
export function suscribirseALaMoneda(avisar: () => void): () => void {
    oyentes.add(avisar);
    return () => oyentes.delete(avisar);
}

interface OpcionesImporte {
    /** Decimales fijos. 2 por defecto; 0 para un KPI que no necesita centavos. */
    decimales?: number;
    /** Antepone `+` a los positivos. Para variaciones, no para importes absolutos. */
    signo?: boolean;
}

/**
 * Formatea un importe en la moneda del negocio: `$14,999.00`, `RD$14,999.00`.
 *
 * Acepta el `string` que envía la API para los campos `Decimal` de Prisma, además de
 * un número. Un valor que no sea numérico devuelve `—`: es preferible un hueco visible
 * a un `$NaN` en una tabla de inventario.
 */
export function formatearImporte(valor: number | string, opciones: OpcionesImporte = {}): string {
    const numero = typeof valor === "number" ? valor : Number(valor);

    if (!Number.isFinite(numero)) return "—";

    return escribirImporte(numero, simbolo, opciones);
}

/**
 * El símbolo delante de una cifra **ya escrita**, para la marca de un eje.
 *
 * Los ejes abrevian a propósito —`$120k`, no `$120,000.00`, que sería ilegible— y por eso no
 * pasan por `formatearImporte`. Eran los únicos importes de la interfaz con un `$` literal.
 */
export function conSimboloDeMoneda(cifra: string | number): string {
    return `${simbolo}${cifra}`;
}
