import { useSaleOrders } from "@/modules/sale-orders/hooks/useSaleOrders";
import { useFalloDeCarga } from "@/shared/hooks/useFalloDeCarga";

/**
 * El día de hoy en el reloj de quien mira, en `AAAA-MM-DD`. El mostrador está en el local, así
 * que su día es el del negocio; el servidor interpreta el rango con la zona del negocio.
 */
export function diaDeHoy(ahora: Date = new Date()): string {
    const dos = (n: number) => String(n).padStart(2, "0");
    return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`;
}

/** El tope de `limit` del listado (`parsePagination`). */
const VENTAS_DEL_DIA = 100;

/**
 * T6-08 — las ventas que **quien está en sesión** registró hoy. Las canceladas no cuentan en el
 * importe: no se cobraron.
 *
 * AUD-008 — el servidor filtra por autor (`createdByEmail`). Antes se pedían las cien primeras
 * del día **de todos** y se quedaban las suyas aquí: un día de más de cien ventas entre todos
 * los vendedores dejaba su resumen corto sin avisar. Con el filtro, el tope son cien **suyas**;
 * si las pasara, `incompleto` lo dice en vez de sumar de menos.
 */
export function useMisVentasDeHoy(email: string | undefined) {
    const hoy = diaDeHoy();
    const consulta = useSaleOrders(
        { from: hoy, to: hoy, createdByEmail: email, limit: VENTAS_DEL_DIA },
        { enabled: Boolean(email), staleTime: 30_000 },
    );
    const { fallo, error } = useFalloDeCarga(consulta);

    const mias = consulta.data?.data ?? [];
    const cobradas = mias.filter((v) => v.status !== "CANCELLED");

    return {
        hoy,
        ventas: mias,
        cantidad: cobradas.length,
        importe: cobradas.reduce((suma, v) => suma + Number(v.total), 0),
        incompleto: (consulta.data?.meta.total ?? 0) > mias.length,
        // Mientras reintenta sin datos sigue siendo un fallo, no una carga (`useFalloDeCarga`).
        cargando: consulta.isLoading && !fallo,
        error: fallo ? error : null,
        reintentando: consulta.isFetching,
    };
}
