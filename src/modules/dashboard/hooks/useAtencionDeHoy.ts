import { useExpiryReport } from "@/modules/reports/hooks/useExpiryReport";
import { usePurchaseOrders } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { useSaleOrders } from "@/modules/sale-orders/hooks/useSaleOrders";
import { useInventoryCounts } from "@/modules/inventory-counts/hooks/useInventoryCounts";

/** Una cifra del bloque «Necesita atención»: `null` mientras carga o si la petición falló. */
export interface Recuento {
    valor: number | null;
    cargando: boolean;
    error: boolean;
}

/** Las filas que puede tener el bloque. `stock` sale de `/reports` y no se pide aquí. */
export type FilaDeAtencion = "stock" | "caducidades" | "conteos" | "compras" | "ventas";

function recuento(valor: number | undefined, cargando: boolean, error: boolean): Recuento {
    return { valor: valor ?? null, cargando, error };
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
    const comprasPendientes = usePurchaseOrders({ status: "PENDING", limit: 1 }, quiere("compras"));
    const comprasParciales = usePurchaseOrders({ status: "PARTIALLY_RECEIVED", limit: 1 }, quiere("compras"));
    const ventas = useSaleOrders({ status: "PENDING", limit: 1 }, quiere("ventas"));

    const totalDeCompras =
        comprasPendientes.data && comprasParciales.data
            ? comprasPendientes.data.meta.total + comprasParciales.data.meta.total
            : undefined;

    return {
        caducidades: recuento(caducidades.data?.meta.total, caducidades.isLoading, caducidades.isError),
        diasDeCaducidad: caducidades.data?.days,
        unidadesCaducadas: caducidades.data?.summary.expiredUnits ?? 0,
        conteos: recuento(conteos.data?.meta.total, conteos.isLoading, conteos.isError),
        compras: recuento(
            totalDeCompras,
            comprasPendientes.isLoading || comprasParciales.isLoading,
            comprasPendientes.isError || comprasParciales.isError,
        ),
        ventas: recuento(ventas.data?.meta.total, ventas.isLoading, ventas.isError),
    };
}
