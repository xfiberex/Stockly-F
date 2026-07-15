import { Link } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";
import { Spinner } from "@/shared/components/Spinner";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { useReports } from "@/modules/reports/hooks/useReports";
import { downloadReportPdf } from "@/modules/reports/api/reports.api";
import {
    CubeIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function ReportsPage() {
    const { data, isLoading } = useReports();

    if (isLoading) {
        return (
            <div className="flex justify-center py-32">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!data) return null;

    const { totals, stockByCategory, topByValue, movementsByMonth, lowStockProducts, stockMetrics } = data;

    // Consolidar movimientos por mes para el chart
    const fmtMonth = (m: string) => {
        const [y, mo] = m.split("-");
        return new Date(+y, +mo - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    };

    const months = [...new Set(movementsByMonth.map((m) => m.month))].sort();
    const movementsChartData = months.map((month) => {
        const ins = movementsByMonth.find((m) => m.month === month && m.type === "IN")?.total ?? 0;
        const outs = movementsByMonth.find((m) => m.month === month && m.type === "OUT")?.total ?? 0;
        const adj = movementsByMonth.find((m) => m.month === month && m.type === "ADJUSTMENT")?.total ?? 0;
        return { month: fmtMonth(month), entradas: ins, salidas: outs, ajustes: adj };
    });

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
                    <p className="text-sm text-gray-500 mt-1">Análisis completo del inventario</p>
                </div>
                <Button variant="secondary" onClick={downloadReportPdf}>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Descargar PDF
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total productos", value: totals.totalProducts, Icon: CubeIcon, bg: "bg-blue-50", text: "text-blue-600" },
                    { label: "Productos activos", value: totals.activeProducts, Icon: CheckCircleIcon, bg: "bg-green-50", text: "text-green-600" },
                    { label: "Bajo stock / agotados", value: lowStockProducts.length, Icon: ExclamationTriangleIcon, bg: "bg-orange-50", text: "text-orange-600" },
                    {
                        label: "Valor inventario",
                        value: `$${totals.inventoryValue.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        Icon: CurrencyDollarIcon,
                        bg: "bg-emerald-50",
                        text: "text-emerald-600",
                    },
                ].map(({ label, value, Icon, bg, text }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                        <div className={`rounded-lg p-2.5 shrink-0 ${bg}`}>
                            <Icon className={`h-6 w-6 ${text}`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">{value}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Valor por categoría + distribución */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-6">Valor por categoría</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stockByCategory} layout="vertical" margin={{ left: 60, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} />
                            <Tooltip
                                formatter={(v) => [`$${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, "Valor"]}
                                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="Valor" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-6">Distribución de stock</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={stockByCategory}
                                dataKey="stock"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                                labelLine={false}
                            >
                                {stockByCategory.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                            <Tooltip formatter={(v) => [Number(v), "Unidades"]} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Movimientos por mes */}
            {movementsChartData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-6">Movimientos por mes (últimos 6 meses)</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={movementsChartData} margin={{ left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                            <Bar dataKey="salidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Salidas" />
                            <Bar dataKey="ajustes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ajustes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Top 10 por valor */}
            {topByValue.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">Top 10 productos por valor</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-6 py-3">#</th>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Precio unit.</th>
                                <th className="px-6 py-3">Stock</th>
                                <th className="px-6 py-3">Valor total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {topByValue.map((p, i) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-gray-400 font-medium">{i + 1}</td>
                                    <td className="px-6 py-3">
                                        <Link
                                            to={`/catalog/products/${p.id}/movements`}
                                            className="font-medium text-gray-900 hover:text-blue-600"
                                        >
                                            {p.name}
                                        </Link>
                                        {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">${Number(p.price).toFixed(2)}</td>
                                    <td className="px-6 py-3 text-gray-700">{p.stock}</td>
                                    <td className="px-6 py-3 font-semibold text-gray-900">
                                        ${Number(p.totalValue).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Productos con stock bajo */}
            {lowStockProducts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">
                            Productos con stock bajo o agotado ({lowStockProducts.length})
                        </h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3">Categoría</th>
                                <th className="px-6 py-3">Stock actual</th>
                                <th className="px-6 py-3">Stock mínimo</th>
                                <th className="px-6 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {lowStockProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 bg-orange-50/30">
                                    <td className="px-6 py-3">
                                        <Link
                                            to={`/catalog/products/${p.id}/movements`}
                                            className="font-medium text-gray-900 hover:text-blue-600"
                                        >
                                            {p.name}
                                        </Link>
                                        {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                                    </td>
                                    <td className="px-6 py-3 text-gray-500">{p.category ?? "—"}</td>
                                    <td className="px-6 py-3 font-semibold text-orange-700">{p.stock}</td>
                                    <td className="px-6 py-3 text-gray-500">{p.minStock}</td>
                                    <td className="px-6 py-3">
                                        <Badge variant={p.stock === 0 ? "danger" : "orange"}>
                                            {p.stock === 0 ? "Agotado" : "Bajo"}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Métricas de rotación de stock */}
            {stockMetrics?.filter((m) => m.totalOutLast30Days > 0).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h2 className="text-base font-semibold text-gray-900">Rotación de stock — últimos 30 días</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Solo productos con movimientos de salida</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-6 py-3">Producto</th>
                                <th className="px-6 py-3 text-right">Salidas (30d)</th>
                                <th className="px-6 py-3 text-right">Vel. diaria</th>
                                <th className="px-6 py-3 text-right">Stock actual</th>
                                <th className="px-6 py-3 text-right">Días restantes</th>
                                <th className="px-6 py-3">Alerta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stockMetrics
                                .filter((m) => m.totalOutLast30Days > 0)
                                .map((m) => (
                                    <tr key={m.productId} className={m.reorderSoon ? "bg-amber-50/40 hover:bg-amber-50" : "hover:bg-gray-50"}>
                                        <td className="px-6 py-3">
                                            <Link
                                                to={`/catalog/products/${m.productId}/movements`}
                                                className="font-medium text-gray-900 hover:text-blue-600"
                                            >
                                                {m.productName}
                                            </Link>
                                            {m.sku && <div className="text-xs text-gray-400 font-mono">{m.sku}</div>}
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-700">{m.totalOutLast30Days}</td>
                                        <td className="px-6 py-3 text-right text-gray-600">{m.dailyVelocity.toFixed(2)}/día</td>
                                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{m.currentStock}</td>
                                        <td className="px-6 py-3 text-right">
                                            {m.daysToStockout !== null ? (
                                                <span className={m.daysToStockout <= 7 ? "font-semibold text-red-600" : m.daysToStockout <= 14 ? "font-medium text-orange-500" : "text-gray-600"}>
                                                    {m.daysToStockout} días
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {m.reorderSoon ? (
                                                <Badge variant="orange">Reabastecer pronto</Badge>
                                            ) : (
                                                <span className="text-gray-400 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
