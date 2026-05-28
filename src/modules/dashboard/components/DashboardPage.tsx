import { useProducts } from "@/modules/products/hooks/useProducts";
import { Spinner } from "@/shared/components/Spinner";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CubeIcon, CheckCircleIcon, ExclamationTriangleIcon, TagIcon } from "@heroicons/react/24/outline";

const statsConfig = (total: number, active: number, lowStock: number, cats: number) => [
    { label: "Total productos", value: total, bg: "bg-blue-50", text: "text-blue-600", Icon: CubeIcon },
    { label: "Productos activos", value: active, bg: "bg-green-50", text: "text-green-600", Icon: CheckCircleIcon },
    { label: "Stock bajo (≤3)", value: lowStock, bg: "bg-orange-50", text: "text-orange-600", Icon: ExclamationTriangleIcon },
    { label: "Categorías", value: cats, bg: "bg-purple-50", text: "text-purple-600", Icon: TagIcon },
];

export default function DashboardPage() {
    // Carga los primeros 100 productos; suficiente para estadísticas locales
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
    const lowStockCount = products.filter((p) => p.stock <= 3).length;
    const categories = [...new Set(products.map((p) => p.category))];

    const chartData = categories.map((cat) => ({
        name: cat,
        stock: products.filter((p) => p.category === cat).reduce((sum, p) => sum + p.stock, 0),
    }));

    const stats = statsConfig(total, activeCount, lowStockCount, categories.length);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Resumen general del inventario</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map(({ label, value, bg, text, Icon }) => (
                    <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
                        <div className={`rounded-lg p-2.5 ${bg}`}>
                            <Icon className={`h-6 w-6 ${text}`} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                            <p className="text-sm text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-6">Stock disponible por categoría</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                        <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Stock" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="text-right">
                <Link to="/products" className="text-sm text-blue-600 hover:underline">
                    Gestionar productos →
                </Link>
            </div>
        </div>
    );
}
