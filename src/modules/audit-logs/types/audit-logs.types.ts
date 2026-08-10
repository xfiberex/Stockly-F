// T4-01 — `action` y `entity` eran `string`, así que un filtro mal escrito no lo veía
// nadie hasta que el backend respondía 400. Ahora son los enums del contrato.
import type { AccionAuditoria, EntidadAuditoria, RegistroAuditoria } from "@/shared/contratos";

export type AuditLog = RegistroAuditoria;
export type AuditAction = AccionAuditoria;
export type AuditEntity = EntidadAuditoria;

export interface AuditLogsQuery {
    page?: number;
    limit?: number;
    entity?: AuditEntity;
    action?: AuditAction;
    userId?: string;
}
