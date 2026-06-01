import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type { AuditLog, AuditLogsQuery } from "../types/audit-logs.types";

export const getAuditLogs = async (params?: AuditLogsQuery): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>("/audit-logs", { params });
    return data.data!;
};
