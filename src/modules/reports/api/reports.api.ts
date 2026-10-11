import api from "@/shared/api/axios";
import { descargarDeLaApi } from "@/shared/api/descargar";
import type { ApiResponse } from "@/shared/types";
import type { AbcSummary, ExpiryReport, PeriodPreset, PeriodReport, ReportSummary } from "../types/reports.types";

export const getReportSummary = async (): Promise<ReportSummary> => {
    const { data } = await api.get<ApiResponse<ReportSummary>>("/reports");
    return data.data!;
};

export const downloadReportPdf = (): Promise<boolean> =>
    descargarDeLaApi("/reports", { format: "pdf" }, `reporte-stockly-${new Date().toISOString().split("T")[0]}.pdf`);

/** T5-10 — de qué periodo sale la clasificación ABC del catálogo y cuántos hay en cada clase. */
export const getAbcSummary = async (): Promise<AbcSummary> => {
    const { data } = await api.get<ApiResponse<AbcSummary>>("/reports/abc");
    return data.data!;
};

/** T5-09 — un atajo o un rango de días del negocio, nunca las dos cosas (el backend lo rechaza). */
export type ConsultaDePeriodo = { preset: PeriodPreset } | { from: string; to: string };

export const getPeriodReport = async (consulta: ConsultaDePeriodo): Promise<PeriodReport> => {
    const { data } = await api.get<ApiResponse<PeriodReport>>("/reports/period", { params: consulta });
    return data.data!;
};

/**
 * Se piden las fechas ya resueltas y no el atajo, para que el archivo sea el del periodo que se
 * está viendo aunque la descarga cruce una medianoche.
 */
export const downloadPeriodReport = (periodo: { from: string; to: string }, formato: "csv" | "pdf"): Promise<boolean> =>
    descargarDeLaApi(
        "/reports/period",
        { from: periodo.from, to: periodo.to, format: formato },
        `informe-${periodo.from}-${periodo.to}.${formato}`,
    );

/** T5-15 — sin `days`, el plazo es el de Configuración; la respuesta dice cuál se usó. */
export interface ConsultaDeCaducidades {
    days?: number;
    warehouseId?: string;
    page?: number;
    limit?: number;
}

export const getExpiryReport = async (params: ConsultaDeCaducidades): Promise<ExpiryReport> => {
    const { data } = await api.get<ApiResponse<ExpiryReport>>("/reports/expiring", { params });
    return data.data!;
};
