import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Badge, type BadgeVariant } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";
import { EsqueletoTabla } from "@/shared/components/Esqueleto";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { useFalloDeCarga } from "@/shared/hooks/useFalloDeCarga";
import { useAuditActors, useAuditLogs } from "@/modules/audit-logs/hooks/useAuditLogs";
import { exportAuditLogsCsv } from "@/modules/audit-logs/api/audit-logs.api";
import { destinoDe, paresDeDetalles } from "@/modules/audit-logs/detalles";
import type { AuditAction, AuditEntity, AuditLog, AuditLogsFilters } from "@/modules/audit-logs/types/audit-logs.types";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { formatearFechaHora } from "@/shared/lib/fechas";
import { CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO } from "@/shared/lib/clasesDeEncabezado";
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
    // T5-07 — cerrar un conteo ajusta stock, como un ajuste en bloque; cancelarlo no mueve nada.
    // T6-08 — una venta hecha, como `SALE_SHIP`.
    SALE_COUNTER: "success",
    COUNT_CLOSE: "info",
    COUNT_CANCEL: "danger",
    // T5-14 — mover mercancía entre almacenes: informativo, como un movimiento de stock.
    STOCK_TRANSFER: "info",
};

/**
 * T4-04 — las acciones y las entidades se nombran **una sola vez**: los enums, y la clave se
 * compone. El compilador exige que estén todos —los `Record` de color son sobre el enum— y el
 * catálogo, que exista la traducción.
 */
const ACCIONES: readonly AuditAction[] = [
    "CREATE", "UPDATE", "DELETE", "RESTORE", "STOCK_MOVEMENT", "BULK_STOCK",
    "ORDER_RECEIVE", "ORDER_CANCEL", "SALE_SHIP", "SALE_CANCEL",
    "USER_ROLE_CHANGE", "USER_ACTIVATE", "USER_DEACTIVATE", "REFRESH_REUSE",
    "COUNT_CLOSE", "COUNT_CANCEL",
    // T6-08 y T5-14. `SALE_COUNTER` faltaba en esta lista desde T6-08: la acción se pintaba en
    // la tabla, pero no se podía filtrar por ella.
    "SALE_COUNTER", "STOCK_TRANSFER",
];

const ENTIDADES: readonly AuditEntity[] = [
    "Product", "PurchaseOrder", "SaleOrder", "User", "Tag", "Category", "Brand", "Supplier",
    "InventoryCount",
    // `Customer` faltaba desde T5-06, por lo mismo que `SALE_COUNTER` arriba.
    "Customer", "Warehouse", "StockTransfer",
];

const claveDeAccion = (accion: AuditAction) => `auditoria.accion.${accion}` as Clave;
const claveDeEntidad = (entidad: AuditEntity) => `auditoria.entidad.${entidad}` as Clave;

const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * AUD-017 — los filtros viven en la URL (`?accion=&entidad=&usuario=&desde=&hasta=&pagina=`):
 * recargar, volver atrás o pasar el enlace enseña la misma bitácora. Lo que no se entiende se
 * ignora en vez de mandarlo y recibir un 400.
 */
function filtrosDeLaUrl(params: URLSearchParams) {
    const accion = params.get("accion");
    const entidad = params.get("entidad");
    const desde = params.get("desde") ?? "";
    const hasta = params.get("hasta") ?? "";
    return {
        action: ACCIONES.includes(accion as AuditAction) ? (accion as AuditAction) : undefined,
        entity: ENTIDADES.includes(entidad as AuditEntity) ? (entidad as AuditEntity) : undefined,
        userId: params.get("usuario") || undefined,
        desde: DIA.test(desde) ? desde : "",
        hasta: DIA.test(hasta) ? hasta : "",
        pagina: Math.max(1, Number(params.get("pagina")) || 1),
    };
}

/** El nombre de lo que se tocó, enlazado si todavía existe. */
function Afectado({ log }: { log: AuditLog }) {
    const { t } = useT();
    const etiqueta = log.entityLabel && log.entity === "SaleOrder" ? `#${log.entityLabel}` : log.entityLabel;
    const destino = log.entityId && log.entityExists ? destinoDe(log.entity, log.entityId, log.entityLabel) : null;
    return (
        <>
            <span className="block text-xs text-foreground-muted">{t(claveDeEntidad(log.entity))}</span>
            {etiqueta ? (
                destino ? (
                    <Link to={destino} className="font-medium text-foreground hover:text-info hover:underline">{etiqueta}</Link>
                ) : (
                    <span className="font-medium text-foreground">{etiqueta}</span>
                )
            ) : (
                log.entityId && <span className="font-mono text-xs text-foreground-muted">#{log.entityId.slice(0, 8)}</span>
            )}
        </>
    );
}

/** AUD-017 — los detalles como pares traducidos, no el JSON. */
function Detalles({ log }: { log: AuditLog }) {
    const traductor = useT();
    const pares = paresDeDetalles(log.details, traductor, log.entityLabel);
    if (pares.length === 0) return <span className="text-foreground-muted">—</span>;
    return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
            {pares.map(({ clave, rotulo, valor }) => (
                <div key={clave} className="contents">
                    <dt className="text-foreground-muted">{rotulo}</dt>
                    <dd className="text-foreground wrap-anywhere">{valor}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function AuditLogsPage() {
    const { t, idioma } = useT();
    const [params, setParams] = useSearchParams();
    const { action, entity, userId, desde, hasta, pagina } = filtrosDeLaUrl(params);
    const rangoInvalido = desde !== "" && hasta !== "" && desde > hasta;

    /** Cambiar un filtro vuelve a la página 1; `replace`: filtrar no llena el historial. */
    const poner = (cambios: Record<string, string | undefined>) =>
        setParams((actuales) => {
            const siguientes = new URLSearchParams(actuales);
            for (const [clave, valor] of Object.entries(cambios)) {
                if (valor) siguientes.set(clave, valor);
                else siguientes.delete(clave);
            }
            if (!("pagina" in cambios)) siguientes.delete("pagina");
            return siguientes;
        }, { replace: true });

    const filtros: AuditLogsFilters = {
        action,
        entity,
        userId,
        // Un rango al revés no se pide: el backend respondería 400.
        from: rangoInvalido ? undefined : desde || undefined,
        to: rangoInvalido ? undefined : hasta || undefined,
    };
    const hayFiltros = Boolean(action || entity || userId || desde || hasta);

    const consulta = useAuditLogs({ page: pagina, limit: 50, ...filtros });
    const { data, isLoading, error, errorUpdateCount, refetch, isFetching } = consulta;
    // AUD-017 — un fallo de carga no es una lista vacía: antes se leía «No hay registros».
    const { fallo, error: motivo } = useFalloDeCarga({ data, error, errorUpdateCount });
    const actores = useAuditActors();

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
    const USER_OPTIONS = [
        { value: "", label: t("auditoria.todosLosUsuarios") },
        ...(actores.data ?? []).map((a) => ({
            value: a.userId,
            label: a.name && a.email ? `${a.name} · ${a.email}` : (a.name ?? a.email ?? a.userId.slice(0, 8)),
        })),
    ];

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.auditoria")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("auditoria.subtitulo")}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {/* AUD-017 — lo que se está viendo, con sus filtros, por el endpoint (por lotes). */}
                    <Button variant="secondary" disabled={rangoInvalido || meta?.total === 0} onClick={() => void exportAuditLogsCsv(filtros)}>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t("auditoria.exportarCsv")}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-44">
                    <Select
                        aria-label={t("auditoria.filtrarPorUsuario")}
                        options={USER_OPTIONS}
                        value={userId ?? ""}
                        onChange={(e) => poner({ usuario: e.target.value })}
                    />
                </div>
                <div className="flex-1 min-w-44">
                    <Select
                        aria-label={t("auditoria.filtrarPorAccion")}
                        options={ACTION_OPTIONS}
                        value={action ?? ""}
                        onChange={(e) => poner({ accion: e.target.value })}
                    />
                </div>
                <div className="flex-1 min-w-44">
                    <Select
                        aria-label={t("auditoria.filtrarPorEntidad")}
                        options={ENTITY_OPTIONS}
                        value={entity ?? ""}
                        onChange={(e) => poner({ entidad: e.target.value })}
                    />
                </div>
                <CampoDeFecha label={t("periodo.desde")} value={desde} onChange={(e) => poner({ desde: e.target.value })} />
                <CampoDeFecha
                    label={t("periodo.hasta")}
                    value={hasta}
                    onChange={(e) => poner({ hasta: e.target.value })}
                    error={rangoInvalido ? t("periodo.rangoInvalido") : undefined}
                />
            </div>

            {fallo ? (
                <ErrorDeCarga titulo={t("auditoria.error.titulo")} error={motivo} onReintentar={() => void refetch()} reintentando={isFetching} className="py-8" />
            ) : isLoading ? (
                <EsqueletoTabla columnas={5} />
            ) : logs.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted space-y-3">
                    <p>{t(hayFiltros ? "auditoria.sinRegistrosConFiltros" : "auditoria.sinRegistros")}</p>
                    {hayFiltros && (
                        <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                            {t("auditoria.quitarFiltros")}
                        </Button>
                    )}
                </div>
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
                                    <tr key={log.id} className="align-top hover:bg-surface-muted">
                                        <td className="px-5 py-3">
                                            <Badge variant={ACTION_VARIANTS[log.action] ?? "neutral"}>
                                                {t(claveDeAccion(log.action))}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3 min-w-40">
                                            <Afectado log={log} />
                                        </td>
                                        <td className="px-5 py-3 text-foreground-muted">
                                            {log.userEmail ?? <span className="text-foreground-muted italic">{t("auditoria.sistema")}</span>}
                                        </td>
                                        <td className="px-5 py-3 min-w-48">
                                            <Detalles log={log} />
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
                    <span>{t("auditoria.paginacion", { pagina, total: meta.totalPages, registros: meta.total })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={pagina === 1} onClick={() => poner({ pagina: String(pagina - 1) })}>{t("comun.anterior")}</Button>
                        <Button variant="secondary" disabled={pagina >= meta.totalPages} onClick={() => poner({ pagina: String(pagina + 1) })}>{t("comun.siguiente")}</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
