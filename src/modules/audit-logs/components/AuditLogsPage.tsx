import { useState } from "react";
import { Badge, type BadgeVariant } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { Spinner } from "@/shared/components/Spinner";
import { useAuditLogs } from "@/modules/audit-logs/hooks/useAuditLogs";

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("es-MX", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

// El color dice qué clase de acción fue: la que crea o completa algo, la que
// destruye o cancela, y la que solo modifica. `RESTORE` deshace un borrado, así
// que va con las positivas; los movimientos de stock son informativos.
const ACTION_VARIANTS: Record<string, BadgeVariant> = {
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
};

const ACTION_OPTIONS = [
    { value: "", label: "Todas las acciones" },
    { value: "CREATE", label: "Crear" },
    { value: "UPDATE", label: "Actualizar" },
    { value: "DELETE", label: "Eliminar" },
    { value: "RESTORE", label: "Restaurar" },
    { value: "STOCK_MOVEMENT", label: "Movimiento de stock" },
    { value: "BULK_STOCK", label: "Ajuste masivo" },
    { value: "ORDER_RECEIVE", label: "Orden recibida" },
    { value: "ORDER_CANCEL", label: "Orden cancelada" },
    { value: "SALE_SHIP", label: "Venta enviada" },
    { value: "SALE_CANCEL", label: "Venta cancelada" },
    { value: "USER_ROLE_CHANGE", label: "Cambio de rol" },
    { value: "USER_ACTIVATE", label: "Activar usuario" },
    { value: "USER_DEACTIVATE", label: "Desactivar usuario" },
];

const ENTITY_OPTIONS = [
    { value: "", label: "Todas las entidades" },
    { value: "Product", label: "Producto" },
    { value: "PurchaseOrder", label: "Orden de compra" },
    { value: "SaleOrder", label: "Orden de venta" },
    { value: "User", label: "Usuario" },
    { value: "Tag", label: "Etiqueta" },
    { value: "Category", label: "Categoría" },
    { value: "Brand", label: "Marca" },
    { value: "Supplier", label: "Proveedor" },
];

const ENTITY_LABELS: Record<string, string> = {
    Product: "Producto", PurchaseOrder: "Orden compra", SaleOrder: "Orden venta",
    User: "Usuario", Tag: "Etiqueta", Category: "Categoría", Brand: "Marca", Supplier: "Proveedor",
};

export default function AuditLogsPage() {
    const [action, setAction] = useState("");
    const [entity, setEntity] = useState("");
    const [page, setPage] = useState(1);

    const { data, isLoading } = useAuditLogs({
        page,
        limit: 50,
        action: action || undefined,
        entity: entity || undefined,
    });

    const logs = data?.data ?? [];
    const meta = data?.meta;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Registro de auditoría</h1>
                <p className="text-sm text-foreground-muted mt-1">Historial de acciones realizadas en el sistema</p>
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-44">
                    <Select
                        options={ACTION_OPTIONS}
                        value={action}
                        onChange={(e) => { setAction(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex-1 min-w-44">
                    <Select
                        options={ENTITY_OPTIONS}
                        value={entity}
                        onChange={(e) => { setEntity(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : logs.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">No hay registros de auditoría.</div>
            ) : (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-5 py-3">Acción</th>
                                <th className="px-5 py-3">Entidad</th>
                                <th className="px-5 py-3">Usuario</th>
                                <th className="px-5 py-3 hidden lg:table-cell">Detalles</th>
                                <th className="px-5 py-3 hidden md:table-cell">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-surface-muted">
                                    <td className="px-5 py-3">
                                        <Badge variant={ACTION_VARIANTS[log.action] ?? "neutral"}>
                                            {log.action.replace(/_/g, " ")}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3 text-foreground">
                                        {ENTITY_LABELS[log.entity] ?? log.entity}
                                        {log.entityId && (
                                            <span className="ml-1.5 text-xs text-foreground-muted font-mono">
                                                #{log.entityId.slice(0, 8)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-foreground-muted">
                                        {log.userEmail ?? <span className="text-foreground-muted italic">Sistema</span>}
                                    </td>
                                    <td className="px-5 py-3 hidden lg:table-cell">
                                        {log.details ? (
                                            <details className="cursor-pointer">
                                                <summary className="text-xs text-info hover:underline">Ver detalles</summary>
                                                <pre className="mt-1 text-xs text-foreground-muted bg-surface-muted rounded p-2 max-w-xs overflow-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </details>
                                        ) : (
                                            <span className="text-foreground-muted">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-foreground-muted hidden md:table-cell whitespace-nowrap">
                                        {formatDate(log.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>Página {page} de {meta.totalPages} — {meta.total} registros</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                        <Button variant="secondary" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
