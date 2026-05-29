import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Spinner } from "@/shared/components/Spinner";
import { Badge } from "@/shared/components/Badge";
import { useStockMovements } from "@/modules/products/hooks/useStockMovements";
import type { StockMovementType } from "@/modules/products/types/product.types";

const TYPE_LABELS: Record<StockMovementType, string> = {
    IN: "Entrada",
    OUT: "Salida",
    ADJUSTMENT: "Ajuste",
    IMPORT: "Importación",
};

const TYPE_VARIANTS: Record<StockMovementType, "success" | "danger" | "blue" | "purple"> = {
    IN: "success",
    OUT: "danger",
    ADJUSTMENT: "blue",
    IMPORT: "purple",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default function StockMovementsPage() {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading, isError } = useStockMovements(id!);

    if (isLoading) {
        return (
            <div className="flex justify-center py-32">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="max-w-4xl mx-auto px-6 py-8">
                <p className="text-red-600">No se pudo cargar el historial de movimientos.</p>
                <Link to="/products" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                    ← Volver a productos
                </Link>
            </div>
        );
    }

    const { product, movements } = data;

    const chartData = movements.map((m) => ({
        date: formatDateShort(m.createdAt),
        stock: m.stockAfter,
        type: m.type,
    }));

    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div>
                <Link
                    to="/products"
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-4"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver a productos
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">Historial de movimientos de stock</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{product.stock}</p>
                            <p className="text-xs text-gray-500">Stock actual</p>
                        </div>
                        <Badge variant={product.isActive ? "success" : "danger"}>
                            {product.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Gráfico */}
            {movements.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-6">Evolución del stock</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 13 }}
                                formatter={(value: number) => [`${value} unidades`, "Stock"]}
                            />
                            <ReferenceLine y={3} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Mín", position: "right", fontSize: 11 }} />
                            <Line
                                type="stepAfter"
                                dataKey="stock"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#3b82f6" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
                    Aún no hay movimientos registrados para este producto.
                </div>
            )}

            {/* Tabla de movimientos */}
            {movements.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">
                            Movimientos ({movements.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="px-6 py-3">Fecha</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Cambio</th>
                                    <th className="px-6 py-3">Stock resultante</th>
                                    <th className="px-6 py-3">Nota</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[...movements].reverse().map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                                            {formatDate(m.createdAt)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <Badge variant={TYPE_VARIANTS[m.type as StockMovementType]}>
                                                {TYPE_LABELS[m.type as StockMovementType] ?? m.type}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-3 font-medium">
                                            <span className={m.delta >= 0 ? "text-green-600" : "text-red-600"}>
                                                {m.delta >= 0 ? `+${m.delta}` : m.delta}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-700">{m.stockAfter}</td>
                                        <td className="px-6 py-3 text-gray-400 text-xs">{m.note ?? "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
