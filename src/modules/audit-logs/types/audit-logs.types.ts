// T4-01 — `action` y `entity` eran `string`, así que un filtro mal escrito no lo veía
// nadie hasta que el backend respondía 400. Ahora son los enums del contrato.
import type { AccionAuditoria, ActorAuditoria, EntidadAuditoria, RegistroAuditoria } from "@/shared/contratos";

export type AuditLog = RegistroAuditoria;
export type AuditAction = AccionAuditoria;
export type AuditEntity = EntidadAuditoria;
/** AUD-017 — una cuenta que aparece en la bitácora (el filtro por usuario). */
export type AuditActor = ActorAuditoria;

/** Los filtros de la bitácora: los mismos para el listado y para la exportación. */
export interface AuditLogsFilters {
    entity?: AuditEntity;
    action?: AuditAction;
    userId?: string;
    /** AUD-017 — días del negocio, `AAAA-MM-DD`, los dos incluidos. */
    from?: string;
    to?: string;
}

export interface AuditLogsQuery extends AuditLogsFilters {
    page?: number;
    limit?: number;
}
