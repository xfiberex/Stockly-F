import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { PeriodPreset, PeriodReport, ReportSummary } from "../types/reports.types";

export const getReportSummary = async (): Promise<ReportSummary> => {
    const { data } = await api.get<ApiResponse<ReportSummary>>("/reports");
    return data.data!;
};

export const downloadReportPdf = (): void => {
    const a = document.createElement("a");
    a.href = `${api.defaults.baseURL}/reports?format=pdf`;
    a.download = `reporte-stockly-${new Date().toISOString().split("T")[0]}.pdf`;
    a.click();
};

/** T5-09 — un atajo o un rango de días del negocio, nunca las dos cosas (el backend lo rechaza). */
export type ConsultaDePeriodo = { preset: PeriodPreset } | { from: string; to: string };

export const getPeriodReport = async (consulta: ConsultaDePeriodo): Promise<PeriodReport> => {
    const { data } = await api.get<ApiResponse<PeriodReport>>("/reports/period", { params: consulta });
    return data.data!;
};

/**
 * Descarga por enlace, como el PDF del resumen: la sesión va en la cookie. Se piden las fechas
 * ya resueltas y no el atajo, para que el archivo sea el del periodo que se está viendo aunque
 * la descarga cruce una medianoche.
 */
export const downloadPeriodReport = (periodo: { from: string; to: string }, formato: "csv" | "pdf"): void => {
    const a = document.createElement("a");
    a.href = `${api.defaults.baseURL}/reports/period?${new URLSearchParams({ ...periodo, format: formato })}`;
    a.download = `informe-${periodo.from}-${periodo.to}.${formato}`;
    a.click();
};
