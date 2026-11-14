import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditActors, getAuditLogs } from "../api/audit-logs.api";
import type { AuditLogsQuery } from "../types/audit-logs.types";

export const AUDIT_LOGS_KEY = ["audit-logs"] as const;

export function useAuditLogs(params?: AuditLogsQuery) {
    return useQuery({
        queryKey: [...AUDIT_LOGS_KEY, params],
        queryFn: () => getAuditLogs(params),
        // Al cambiar de página o de filtro se sigue viendo la tabla anterior hasta que llega la nueva.
        placeholderData: keepPreviousData,
    });
}

/** AUD-017 — las cuentas del filtro por usuario. Cambia poco: no se vuelve a pedir en cada visita. */
export function useAuditActors() {
    return useQuery({
        queryKey: [...AUDIT_LOGS_KEY, "actors"],
        queryFn: getAuditActors,
        staleTime: 5 * 60_000,
    });
}
