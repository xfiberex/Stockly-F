import { useAtencion } from "@/modules/reports/hooks/useReports";

/** Una cifra del bloque «Necesita atención»: `null` mientras carga o si la petición falló. */
export interface Recuento {
    valor: number | null;
    cargando: boolean;
    error: boolean;
    /** Con error, si ya se está volviendo a pedir: el «Reintentar» de la fila lo dice. */
    reintentando?: boolean;
}

/** Las filas que puede tener el bloque. */
export type FilaDeAtencion = "stock" | "caducidades" | "conteos" | "compras" | "ventas";

/**
 * Lo pendiente del panel: stock bajo, caducidades, conteos abiertos, compras por recibir y ventas
 * por enviar.
 *
 * AUD-010 — **de una sola petición**, `GET /reports/attention`. Antes cada cifra se leía de un
 * listado con `limit: 1` (`meta.total`) y la de stock de `/reports`: seis peticiones para ADMIN
 * en cada carga en frío, contra el límite global de la API (100 por IP cada 15 minutos). Ahora
 * es una, y ADMIN pide además su resumen. Las cifras siguen siendo las de cada lista filtrada:
 * el servidor cuenta con la misma condición (está fijado en `reports.test.ts`).
 *
 * Todas las filas comparten la consulta, así que caen y vuelven juntas. Con error, `valor` es
 * `null` aunque hubiera una cifra de antes (AUD-008, paso 10), y una consulta sin datos que
 * falló **sigue fallada mientras se reintenta** (la regla de `useFalloDeCarga`: TanStack v5
 * vuelve a `pending` y la fila se llevaba su «Reintentar» con el foco dentro).
 */
export function useAtencionDeHoy(filas: readonly FilaDeAtencion[]) {
    const consulta = useAtencion({ enabled: filas.length > 0 });
    const { data } = consulta;
    const error = consulta.isError || (data === undefined && consulta.errorUpdateCount > 0);
    const recuento = (valor: number | undefined): Recuento => ({
        valor: error ? null : (valor ?? null),
        cargando: consulta.isLoading && !error,
        error,
        reintentando: error && consulta.isFetching,
    });
    const caducidades = error ? undefined : data?.expiring;

    return {
        stock: recuento(data?.lowStock.total),
        /** `null` mientras no ha llegado; vacía si falló. */
        lowStockProducts: error ? [] : (data?.lowStock.products ?? null),
        caducidades: recuento(data?.expiring.total),
        diasDeCaducidad: caducidades?.days,
        lotesCaducados: caducidades?.expiredCount ?? 0,
        // AUD-008 — el lote que antes caduca, con su nombre: la campana decía «lote L-20261030
        // de Yogur natural» y el panel solo «8».
        primerLote: caducidades?.first ?? undefined,
        conteos: recuento(data?.openCounts),
        compras: recuento(data?.purchasesToReceive),
        ventas: recuento(data?.pendingSales),
    };
}
