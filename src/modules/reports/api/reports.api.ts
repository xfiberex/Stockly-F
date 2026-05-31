import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { ReportSummary } from "../types/reports.types";

export const getReportSummary = async (): Promise<ReportSummary> => {
    const { data } = await api.get<ApiResponse<ReportSummary>>("/reports");
    return data.data!;
};
