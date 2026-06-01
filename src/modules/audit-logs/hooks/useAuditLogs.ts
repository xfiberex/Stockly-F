import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api/audit-logs.api";
import type { AuditLogsQuery } from "../types/audit-logs.types";

export const AUDIT_LOGS_KEY = ["audit-logs"] as const;

export function useAuditLogs(params?: AuditLogsQuery) {
    return useQuery({
        queryKey: [...AUDIT_LOGS_KEY, params],
        queryFn: () => getAuditLogs(params),
    });
}
