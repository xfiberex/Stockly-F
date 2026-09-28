import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getPeriodReport, getReportSummary, type ConsultaDePeriodo } from "../api/reports.api";

export function useReports() {
    return useQuery({
        queryKey: ["reports"],
        queryFn: getReportSummary,
        staleTime: 30_000,
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
