import { useExpiryReport } from "@/modules/reports/hooks/useExpiryReport";
import { usePurchaseOrders } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { useSaleOrders } from "@/modules/sale-orders/hooks/useSaleOrders";
import { useInventoryCounts } from "@/modules/inventory-counts/hooks/useInventoryCounts";
import { POR_RECIBIR } from "@/modules/purchase-orders/types/purchase-orders.types";

/** Una cifra del bloque «Necesita atención»: `null` mientras carga o si la petición falló. */
export interface Recuento {
    valor: number | null;
    cargando: boolean;
    error: boolean;
    /** Con error, si ya se está volviendo a pedir: el «Reintentar» de la fila lo dice. */
    reintentando?: boolean;
}

/** Las filas que puede tener el bloque. `stock` sale de `/reports` y no se pide aquí. */
export type FilaDeAtencion = "stock" | "caducidades" | "conteos" | "compras" | "ventas";

/** Lo que `recuento` lee de una consulta de TanStack Query. */
interface Consulta {
    data?: { meta: { total: number } };
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
    errorUpdateCount: number;
}

/**
 * Con error, `valor` es `null` aunque haya una cifra de antes (AUD-008, paso 10): una fila no
 * puede decir «No disponible» y a la vez enseñar el detalle y el enlace de la cifra vieja.
 *
 * Crítica del 2026-11-06 (2.ª) — una consulta sin datos que falló **sigue fallada mientras se
 * reintenta** (la regla de `useFalloDeCarga`): TanStack v5 vuelve a `pending`, y la fila pasaba a
 * «cargando» y se llevaba su «Reintentar» con el foco dentro. Ahora el botón se queda, ocupado.
 */
function recuento(q: Consulta): Recuento {
    const error = q.isError || (q.data === undefined && q.errorUpdateCount > 0);
    return { valor: error ? null : (q.data?.meta.total ?? null), cargando: q.isLoading && !error, error, reintentando: error && q.isFetching };
}

/**
 * Lo mismo que `/reports` (`useReports`): volver al panel dentro de este plazo no repite las
 * peticiones. Sin él, cada visita lanzaba cinco más contra el límite global de la API (100 por
 * IP cada 15 minutos), y una mutación sigue invalidándolas al momento.
 */
const FRESCURA = 30_000;

/**
 * Lo pendiente que no trae `/reports`: caducidades, conteos abiertos, compras por recibir y
 * ventas por enviar. **Solo se pide lo que el rol va a ver** (`filas`): una consulta
 * deshabilitada no sale a la red.
 *
 * Solo hacen falta los totales, así que cada lista se pide con `limit: 1` y se lee su
 * `meta.total`. Se reutilizan los hooks de cada módulo —y con ellos sus claves de caché— para
 * que recibir una compra o enviar una venta invalide también estas cifras, sin cablearlo aparte.
 * Todas las rutas son de lectura para cualquier rol (`PERMISOS`).
 */
export function useAtencionDeHoy(filas: readonly FilaDeAtencion[]) {
    const quiere = (fila: FilaDeAtencion) => ({ enabled: filas.includes(fila), staleTime: FRESCURA });

    const caducidades = useExpiryReport({ limit: 1 }, quiere("caducidades"));
    const conteos = useInventoryCounts({ status: "OPEN", limit: 1 }, quiere("conteos"));
    // AUD-008 — «por recibir» en una sola petición: la API acepta varios estados. Eran dos.
    const compras = usePurchaseOrders({ status: POR_RECIBIR, limit: 1 }, quiere("compras"));
    const ventas = useSaleOrders({ status: "PENDING", limit: 1 }, quiere("ventas"));

    return {
        caducidades: recuento(caducidades),
        diasDeCaducidad: caducidades.data?.days,
        lotesCaducados: caducidades.isError ? 0 : (caducidades.data?.summary.expiredCount ?? 0),
        // AUD-008 — el lote que antes caduca (el informe los ordena por fecha), con su nombre:
        // la campana decía «lote L-20261030 de Yogur natural» y el panel solo «8».
        primerLote: caducidades.isError ? undefined : caducidades.data?.data[0],
        conteos: recuento(conteos),
        compras: recuento(compras),
        ventas: recuento(ventas),
    };
}
