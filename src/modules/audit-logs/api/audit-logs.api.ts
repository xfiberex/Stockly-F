import api from "@/shared/api/axios";
import { descargarDeLaApi } from "@/shared/api/descargar";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type { AuditActor, AuditLog, AuditLogsFilters, AuditLogsQuery } from "../types/audit-logs.types";

export const getAuditLogs = async (params?: AuditLogsQuery): Promise<PaginatedResponse<AuditLog>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<AuditLog>>>("/audit-logs", { params });
    return data.data!;
};

/** AUD-017 — quién aparece en la bitácora, para el filtro por usuario. */
export const getAuditActors = async (): Promise<AuditActor[]> => {
    const { data } = await api.get<ApiResponse<AuditActor[]>>("/audit-logs/actors");
    return data.data!;
};

/** AUD-017 — la bitácora con los filtros de la pantalla, por el endpoint (por lotes en el servidor). */
export const exportAuditLogsCsv = (filtros: AuditLogsFilters): Promise<boolean> =>
    descargarDeLaApi(
        "/audit-logs/export",
        { format: "csv", ...filtros },
        `stockly-auditoria-${new Date().toISOString().split("T")[0]}.csv`,
    );
