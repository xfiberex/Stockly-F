import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { ReportSummary } from "../types/reports.types";

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
