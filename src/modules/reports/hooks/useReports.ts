import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAbcSummary, getAttention, getPeriodReport, getReportSummary, type ConsultaDePeriodo } from "../api/reports.api";
import { queryKeys } from "@/shared/constants/queryKeys";

/**
 * AUD-009 — los importes solo le llegan a ADMIN. `enabled`: el panel solo pide el resumen a
 * quien lo enseña; los demás roles tienen todo lo suyo en `useAtencion`.
 */
export function useReports({ enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: ["reports"],
        queryFn: getReportSummary,
        staleTime: 30_000,
        enabled,
    });
}

/**
 * AUD-010 — «Necesita atención», en una petición. La refresca cualquier mutación que salga bien
 * (`queryClient.ts`): recibir una compra, enviar una venta o cerrar un conteo cambia sus cifras, y
 * antes lo garantizaba reutilizar las claves de cada lista.
 */
export function useAtencion({ enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: queryKeys.atencion,
        queryFn: getAttention,
        staleTime: 30_000,
        enabled,
    });
}

/**
 * T5-09 — el informe de un periodo. `keepPreviousData`: al cambiar de periodo se siguen viendo
 * las cifras anteriores hasta que llegan las nuevas, en vez de vaciar la pantalla en un
 * spinner a cada clic de atajo.
 */
export function usePeriodReport(consulta: ConsultaDePeriodo) {
    return useQuery({
        queryKey: ["reports", "period", consulta],
        queryFn: () => getPeriodReport(consulta),
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });
}

/**
 * T5-10 — el periodo de la clasificación ABC. Cambia como mucho una vez al día, así que no se
 * vuelve a pedir en cada visita al catálogo.
 */
export function useAbcSummary() {
    return useQuery({
        queryKey: ["reports", "abc"],
        queryFn: getAbcSummary,
        staleTime: 10 * 60_000,
    });
}
