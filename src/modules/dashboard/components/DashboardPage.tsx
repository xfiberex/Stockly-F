import { useProducts } from "@/modules/products/hooks/useProducts";
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
    const { data, isLoading } = useProducts({ limit: 100, page: 1 });

    if (isLoading) {
        return (
            <div className="flex justify-center py-32">
                <Spinner size="lg" />
            </div>
        );
    }

    const products = data?.data ?? [];
    const total = data?.meta.total ?? 0;
    const activeCount = products.filter((p) => p.isActive).length;
    const lowStockCount = products.filter((p) => p.stock <= (p.minStock ?? 0) && p.isActive).length;
    const categories = [...new Set(products.map((p) => p.category?.name).filter(Boolean))];
    const inventoryValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);

    const stockByCategory = categories.map((cat) => {
        const catProducts = products.filter((p) => p.category?.name === cat);
        return {
            name: cat,
            stock: catProducts.reduce((sum, p) => sum + p.stock, 0),
            valor: catProducts.reduce((sum, p) => sum + Number(p.price) * p.stock, 0),
        };
    });

    const stats: {
        label: string;
        value: number;
        bg: string;
        text: string;
        Icon: React.ElementType;
        to: string;
        highlight?: boolean;
    }[] = [
        { label: "Total productos", value: total, bg: "bg-blue-50", text: "text-blue-600", Icon: CubeIcon, to: "/catalog/products" },
        { label: "Productos activos", value: activeCount, bg: "bg-green-50", text: "text-green-600", Icon: CheckCircleIcon, to: "/catalog/products" },
        { label: "Stock bajo", value: lowStockCount, bg: "bg-orange-50", text: "text-orange-600", Icon: ExclamationTriangleIcon, to: "/reports", highlight: lowStockCount > 0 },
        { label: "Categorías", value: categories.length, bg: "bg-purple-50", text: "text-purple-600", Icon: TagIcon, to: "/catalog/categories" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Resumen general del inventario</p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, bg, text, Icon, to, highlight }) => (
                    <Link
                        key={label}
                        to={to}
                        className={`bg-white rounded-xl border p-3 sm:p-5 flex items-center gap-3 sm:gap-4 hover:shadow-sm transition-shadow ${
                            highlight
                                ? "border-orange-200 bg-orange-50/30"
                                : "border-gray-200"
                        }`}
                    >
                        <div className={`rounded-lg p-2 sm:p-2.5 shrink-0 ${bg}`}>
                            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${text}`} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-xl sm:text-2xl font-bold ${highlight ? "text-orange-700" : "text-gray-900"}`}>{value}</p>
                            <p className="text-xs sm:text-sm text-gray-500 leading-tight">{label}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Valor del inventario */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                <div className="rounded-lg p-2.5 shrink-0 bg-emerald-50">
                    <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-900">
                        ${inventoryValue.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">Valor total del inventario activo</p>
                </div>
                <div className="ml-auto text-right hidden sm:block">
                    <Link to="/reports" className="text-sm text-blue-600 hover:underline">
                        Ver reporte completo →
                    </Link>
                </div>
            </div>

            {/* Gráfico stock por categoría */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-6">Stock y valor por categoría</h2>
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
                                    ? [`$${Number(value).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, "Valor"]
                                    : [Number(value), "Stock"]
                            }
                        />
                        <Bar yAxisId="left" dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Stock" />
                        <Bar yAxisId="right" dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} name="Valor" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Alertas de stock bajo */}
            {lowStockCount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                        <h2 className="text-sm font-semibold text-orange-800">
                            {lowStockCount} producto{lowStockCount !== 1 ? "s" : ""} con stock bajo o agotado
                        </h2>
                    </div>
                    <div className="space-y-1">
                        {products
                            .filter((p) => p.stock <= (p.minStock ?? 0) && p.isActive)
                            .slice(0, 5)
                            .map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-sm">
                                    <Link
                                        to={`/catalog/products/${p.id}/movements`}
                                        className="text-orange-700 hover:underline font-medium"
                                    >
                                        {p.name}
                                    </Link>
                                    <span className="text-orange-700 font-semibold tabular-nums">
                                        {p.stock} uds. — mín. {p.minStock}
                                    </span>
                                </div>
                            ))}
                        {lowStockCount > 5 && (
                            <Link to="/reports" className="text-xs text-orange-700 hover:underline">
                                Ver {lowStockCount - 5} más →
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <div className="text-right">
                <Link to="/catalog/products" className="text-sm text-blue-600 hover:underline">
                    Gestionar productos →
                </Link>
            </div>
        </div>
    );
}
