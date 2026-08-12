import { useState } from "react";
import { Badge, type BadgeVariant } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { Spinner } from "@/shared/components/Spinner";
import { useAuditLogs } from "@/modules/audit-logs/hooks/useAuditLogs";
import type { AuditAction, AuditEntity } from "@/modules/audit-logs/types/audit-logs.types";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { formatearFechaHora } from "@/shared/lib/fechas";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

// El color dice qué clase de acción fue: la que crea o completa algo, la que
// destruye o cancela, y la que solo modifica. `RESTORE` deshace un borrado, así
// que va con las positivas; los movimientos de stock son informativos.
//
// T4-01 — `Record<AuditAction, …>` y no `Record<string, …>`: así añadir una acción al
// enum del backend obliga a elegirle color aquí en vez de dejarla caer en el neutro por
// omisión. Es como se destapó que `REFRESH_REUSE` no tenía ninguno desde T2-31.
const ACTION_VARIANTS: Record<AuditAction, BadgeVariant> = {
    CREATE: "success",
    UPDATE: "info",
    DELETE: "danger",
    RESTORE: "success",
    STOCK_MOVEMENT: "info",
    BULK_STOCK: "info",
    ORDER_RECEIVE: "success",
    ORDER_CANCEL: "danger",
    SALE_SHIP: "success",
    SALE_CANCEL: "danger",
    USER_ROLE_CHANGE: "info",
    USER_ACTIVATE: "success",
    USER_DEACTIVATE: "danger",
    // No la provoca un usuario: es la detección de reuso de refresh token de T2-31, o sea
    // una anomalía de seguridad. Va en rojo porque leerla como un evento más sería justo
    // lo contrario de para lo que se registra.
    REFRESH_REUSE: "danger",
};

/**
 * T4-04 — las acciones y las entidades se nombran **una sola vez**.
 *
 * Antes había tres listas: las opciones del filtro de acción, las del de entidad y un
 * `ENTITY_LABELS` con nombres más cortos para la tabla («Orden compra» frente a «Orden de
 * compra»). Con dos idiomas eso son seis listas que mantener a la par, así que se quedan
 * los enums y la clave se compone: el compilador sigue exigiendo que estén todos —los
 * `Record` de color son sobre el enum— y el catálogo, que exista la traducción.
 *
 * De paso, la insignia de la tabla deja de pintar el enum en crudo («USER_ROLE_CHANGE»).
 */
const ACCIONES: readonly AuditAction[] = [
    "CREATE", "UPDATE", "DELETE", "RESTORE", "STOCK_MOVEMENT", "BULK_STOCK",
    "ORDER_RECEIVE", "ORDER_CANCEL", "SALE_SHIP", "SALE_CANCEL",
    "USER_ROLE_CHANGE", "USER_ACTIVATE", "USER_DEACTIVATE", "REFRESH_REUSE",
];

const ENTIDADES: readonly AuditEntity[] = [
    "Product", "PurchaseOrder", "SaleOrder", "User", "Tag", "Category", "Brand", "Supplier",
];

const claveDeAccion = (accion: AuditAction) => `auditoria.accion.${accion}` as Clave;
const claveDeEntidad = (entidad: AuditEntity) => `auditoria.entidad.${entidad}` as Clave;

export default function AuditLogsPage() {
    const { t, idioma } = useT();
    // El `""` es «sin filtro»; el resto solo admite valores del enum, así que un filtro
    // mal escrito deja de compilar en vez de acabar en un 400 del backend.
    const [action, setAction] = useState<AuditAction | "">("");
    const [entity, setEntity] = useState<AuditEntity | "">("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useAuditLogs({
        page,
        limit: 50,
        action: action || undefined,
        entity: entity || undefined,
    });

    const logs = data?.data ?? [];
    const meta = data?.meta;

    // Dentro del componente: fuera se armarían al cargar el módulo, con el idioma que
    // hubiera entonces, y no cambiarían al elegir otro.
    const ACTION_OPTIONS = [
        { value: "", label: t("auditoria.todasLasAcciones") },
        ...ACCIONES.map((accion) => ({ value: accion, label: t(claveDeAccion(accion)) })),
    ];

    const ENTITY_OPTIONS = [
        { value: "", label: t("auditoria.todasLasEntidades") },
        ...ENTIDADES.map((entidad) => ({ value: entidad, label: t(claveDeEntidad(entidad)) })),
    ];

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.auditoria")}</h1>
                <p className="text-sm text-foreground-muted mt-1">{t("auditoria.subtitulo")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-44">
                    <Select
                        options={ACTION_OPTIONS}
                        value={action}
                        onChange={(e) => { setAction(e.target.value as AuditAction | ""); setPage(1); }}
                    />
                </div>
                <div className="flex-1 min-w-44">
                    <Select
                        options={ENTITY_OPTIONS}
                        value={entity}
                        onChange={(e) => { setEntity(e.target.value as AuditEntity | ""); setPage(1); }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : logs.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">{t("auditoria.sinRegistros")}</div>
            ) : (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
                            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                <tr>
                                    <th className="px-5 py-3">{t("auditoria.columna.accion")}</th>
                                    <th className="px-5 py-3">{t("auditoria.columna.entidad")}</th>
                                    <th className="px-5 py-3">{t("usuarios.columna.usuario")}</th>
                                    <th className="px-5 py-3">{t("auditoria.columna.detalles")}</th>
                                    <th className="px-5 py-3">{t("comun.fecha")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-surface-muted">
                                        <td className="px-5 py-3">
                                            <Badge variant={ACTION_VARIANTS[log.action] ?? "neutral"}>
                                                {t(claveDeAccion(log.action))}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3 text-foreground">
                                            {t(claveDeEntidad(log.entity))}
                                            {log.entityId && (
                                                <span className="ml-1.5 text-xs text-foreground-muted font-mono">
                                                    #{log.entityId.slice(0, 8)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-foreground-muted">
                                            {log.userEmail ?? <span className="text-foreground-muted italic">{t("auditoria.sistema")}</span>}
                                        </td>
                                        <td className="px-5 py-3">
                                            {log.details ? (
                                                <details className="cursor-pointer">
                                                    <summary className="text-xs text-info hover:underline">{t("auditoria.verDetalles")}</summary>
                                                    <pre className="mt-1 text-xs text-foreground-muted bg-surface-muted rounded p-2 max-w-xs overflow-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </details>
                                            ) : (
                                                <span className="text-foreground-muted">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-foreground-muted whitespace-nowrap">
                                            {formatearFechaHora(idioma, log.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{t("auditoria.paginacion", { pagina: page, total: meta.totalPages, registros: meta.total })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("comun.anterior")}</Button>
                        <Button variant="secondary" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("comun.siguiente")}</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
