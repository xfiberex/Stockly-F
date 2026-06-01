import { useState } from "react";
import { Badge } from "@/shared/components/Badge";
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

const ACTION_VARIANTS: Record<string, "success" | "danger" | "blue" | "orange" | "purple" | "default"> = {
    CREATE: "success",
    UPDATE: "blue",
    DELETE: "danger",
    RESTORE: "teal" as "default",
    STOCK_MOVEMENT: "orange",
    BULK_STOCK: "orange",
    ORDER_RECEIVE: "success",
    ORDER_CANCEL: "danger",
    SALE_SHIP: "success",
    SALE_CANCEL: "danger",
    USER_ROLE_CHANGE: "purple",
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
                <h1 className="text-2xl font-bold text-gray-900">Registro de auditoría</h1>
                <p className="text-sm text-gray-500 mt-1">Historial de acciones realizadas en el sistema</p>
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
                <div className="py-16 text-center text-sm text-gray-400">No hay registros de auditoría.</div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-5 py-3">Acción</th>
                                <th className="px-5 py-3">Entidad</th>
                                <th className="px-5 py-3">Usuario</th>
                                <th className="px-5 py-3 hidden lg:table-cell">Detalles</th>
                                <th className="px-5 py-3 hidden md:table-cell">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-5 py-3">
                                        <Badge variant={ACTION_VARIANTS[log.action] ?? "default"}>
                                            {log.action.replace(/_/g, " ")}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3 text-gray-700">
                                        {ENTITY_LABELS[log.entity] ?? log.entity}
                                        {log.entityId && (
                                            <span className="ml-1.5 text-xs text-gray-400 font-mono">
                                                #{log.entityId.slice(0, 8)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600">
                                        {log.userEmail ?? <span className="text-gray-400 italic">Sistema</span>}
                                    </td>
                                    <td className="px-5 py-3 hidden lg:table-cell">
                                        {log.details ? (
                                            <details className="cursor-pointer">
                                                <summary className="text-xs text-blue-600 hover:underline">Ver detalles</summary>
                                                <pre className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2 max-w-xs overflow-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            </details>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                                        {formatDate(log.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
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
