import { formatearImporte } from "@/shared/lib/moneda";
import { useReports } from "@/modules/reports/hooks/useReports";
import { Spinner } from "@/shared/components/Spinner";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
    CubeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    TagIcon,
    CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

export default function DashboardPage() {
    const { data, isLoading } = useReports();

    if (isLoading || !data) {
        return (
            <div className="flex justify-center py-32">
                <Spinner size="lg" />
            </div>
        );
    }

    const { totals, stockByCategory, lowStockProducts } = data;
    const lowStockCount = totals.lowStockCount;

    const stats: {
        label: string;
        value: number;
        bg: string;
        text: string;
        Icon: React.ElementType;
        to: string;
        highlight?: boolean;
    }[] = [
        { label: "Total productos", value: totals.totalProducts, bg: "bg-info-surface", text: "text-info", Icon: CubeIcon, to: "/catalog/products" },
        { label: "Productos activos", value: totals.activeProducts, bg: "bg-success-surface", text: "text-success", Icon: CheckCircleIcon, to: "/catalog/products" },
        { label: "Stock bajo", value: lowStockCount, bg: "bg-warning-surface", text: "text-warning", Icon: ExclamationTriangleIcon, to: "/reports", highlight: lowStockCount > 0 },
        // Categorías es un recuento, no un estado: se queda en la variante neutra en
        // vez de repetir el informativo de «Total productos».
        { label: "Categorías", value: stockByCategory.length, bg: "bg-surface-muted", text: "text-foreground-muted", Icon: TagIcon, to: "/catalog/categories" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-foreground-muted mt-1">Resumen general del inventario</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, bg, text, Icon, to, highlight }) => (
                    <Link
                        key={label}
                        to={to}
                        className={`bg-surface rounded-xl border p-3 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-raised transition-shadow ${
                            highlight
                                ? "border-warning bg-warning-surface/30"
                                : "border-border"
                        }`}
                    >
                        <div className={`rounded-lg p-2 sm:p-2.5 shrink-0 ${bg}`}>
                            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${text}`} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-xl sm:text-2xl font-bold tabular-nums ${highlight ? "text-warning" : "text-foreground"}`}>{value}</p>
                            <p className="text-xs sm:text-sm text-foreground-muted leading-tight">{label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Valor del inventario */}
            <div className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4">
                <div className="rounded-lg p-2.5 shrink-0 bg-success-surface">
                    <CurrencyDollarIcon className="h-6 w-6 text-success" />
                </div>
                <div>
                    {/* El KPI que más se refresca: sin cifras tabulares cambiaba de ancho
                        con cada actualización, y el bloque entero se movía. */}
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                        {formatearImporte(totals.inventoryValue)}
                    </p>
                    <p className="text-sm text-foreground-muted">Valor total del inventario activo</p>
                </div>
                <div className="ml-auto text-right hidden sm:block">
                    <Link to="/reports" className="text-sm text-info hover:underline">
                        Ver reporte completo →
                    </Link>
                </div>
            </div>

            {/* Gráfico stock por categoría */}
            <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-base font-semibold text-foreground mb-6">Stock y valor por categoría</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stockByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                            formatter={(value, name) =>
                                name === "Valor"
                                    ? [formatearImporte(Number(value)), "Valor"]
                                    : [Number(value), "Stock"]
                            }
                        />
                        <Bar yAxisId="left" dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Stock" />
                        <Bar yAxisId="right" dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Valor" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Alertas de stock bajo */}
            {lowStockCount > 0 && (
                <div className="bg-warning-surface border border-warning rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
                        <h2 className="text-sm font-semibold text-warning">
                            {lowStockCount} producto{lowStockCount !== 1 ? "s" : ""} con stock bajo o agotado
                        </h2>
                    </div>
                    <div className="space-y-1">
                        {lowStockProducts.slice(0, 5).map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-sm">
                                <Link
                                    to={`/catalog/products/${p.id}/movements`}
                                    className="text-warning hover:underline font-medium"
                                >
                                    {p.name}
                                </Link>
                                <span className="text-warning font-semibold tabular-nums">
                                    {p.stock} uds. — mín. {p.minStock}
                                </span>
                            </div>
                        ))}
                        {lowStockCount > 5 && (
                            <Link to="/reports" className="text-xs text-warning hover:underline">
                                Ver {lowStockCount - 5} más →
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <div className="text-right">
                <Link to="/catalog/products" className="text-sm text-info hover:underline">
                    Gestionar productos →
                </Link>
            </div>
        </div>
    );
}
