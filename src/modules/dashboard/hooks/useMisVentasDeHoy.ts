import { useSaleOrders } from "@/modules/sale-orders/hooks/useSaleOrders";

/**
 * El día de hoy en el reloj de quien mira, en `AAAA-MM-DD`. El mostrador está en el local, así
 * que su día es el del negocio; el servidor interpreta el rango con la zona del negocio.
 */
export function diaDeHoy(ahora: Date = new Date()): string {
    const dos = (n: number) => String(n).padStart(2, "0");
    return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

/** El tope de `limit` del listado (`parsePagination`). Un mostrador no llega a cien ventas en un día. */
const VENTAS_DEL_DIA = 100;

/**
 * T6-08 — las ventas que **quien está en sesión** registró hoy. El listado no filtra por autor,
 * así que se piden las del día y se quedan las suyas por `createdByEmail`. Las canceladas no
 * cuentan en el importe: no se cobraron.
 */
export function useMisVentasDeHoy(email: string | undefined) {
    const hoy = diaDeHoy();
    const consulta = useSaleOrders({ from: hoy, to: hoy, limit: VENTAS_DEL_DIA }, { enabled: Boolean(email), staleTime: 30_000 });

    const mias = (consulta.data?.data ?? []).filter(
        (v) => v.createdByEmail !== null && v.createdByEmail.toLowerCase() === email?.toLowerCase(),
    );
    const cobradas = mias.filter((v) => v.status !== "CANCELLED");

    return {
        ventas: mias,
        cantidad: cobradas.length,
        importe: cobradas.reduce((suma, v) => suma + Number(v.total), 0),
        cargando: consulta.isLoading,
        error: consulta.isError ? consulta.error : null,
        reintentar: () => void consulta.refetch(),
        reintentando: consulta.isFetching,
    };
}
