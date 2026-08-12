import { formatearImporte } from "@/shared/lib/moneda";
import { useReports } from "@/modules/reports/hooks/useReports";
import { Spinner } from "@/shared/components/Spinner";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import {
    CubeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    TagIcon,
    CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { cn } from "@/shared/lib/cn";

export default function DashboardPage() {
    const { t, tn } = useT();
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

    // La `label` es la clave; se traduce al pintar. Como esta lista se arma en cada
    // render tampoco haría falta, pero deja el criterio a la vista y hace que la `key`
    // del `map` no dependa del idioma.
    const stats: {
        label: Clave;
        value: number;
        bg: string;
        text: string;
        Icon: React.ElementType;
        to: string;
        highlight?: boolean;
    }[] = [
        { label: "dashboard.totalProductos", value: totals.totalProducts, bg: "bg-info-surface", text: "text-info", Icon: CubeIcon, to: "/catalog/products" },
        { label: "dashboard.productosActivos", value: totals.activeProducts, bg: "bg-success-surface", text: "text-success", Icon: CheckCircleIcon, to: "/catalog/products" },
        { label: "dashboard.stockBajo", value: lowStockCount, bg: "bg-warning-surface", text: "text-warning", Icon: ExclamationTriangleIcon, to: "/reports", highlight: lowStockCount > 0 },
        // Categorías es un recuento, no un estado: se queda en la variante neutra en
        // vez de repetir el informativo de «Total productos».
        { label: "ruta.categorias", value: stockByCategory.length, bg: "bg-surface-muted", text: "text-foreground-muted", Icon: TagIcon, to: "/catalog/categories" },
    ];

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-8")}>
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.dashboard")}</h1>
                <p className="text-sm text-foreground-muted mt-1">{t("dashboard.subtitulo")}</p>
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
                            <p className="text-xs sm:text-sm text-foreground-muted leading-tight">{t(label)}</p>
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
                    <p className="text-sm text-foreground-muted">{t("dashboard.valorInventario")}</p>
                </div>
                <div className="ml-auto text-right hidden sm:block">
                    <Link to="/reports" className="text-sm text-info hover:underline">
                        {t("dashboard.verReporte")}
                    </Link>
                </div>
            </div>

            {/* Gráfico stock por categoría */}
            <div className="bg-surface rounded-xl border border-border p-6">
                <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.stockPorCategoria")}</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stockByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                            contentStyle={ESTILO_DE_TOOLTIP}
                            // La serie se identifica por su `dataKey`, no por el nombre
                            // visible: ese ya viene traducido y compararlo con un literal
                            // en español dejaría de casar en inglés.
                            formatter={(value, name) =>
                                name === t("grafico.valor")
                                    ? [formatearImporte(Number(value)), t("grafico.valor")]
                                    : [Number(value), t("productos.campo.stock")]
                            }
                        />
                        <Bar yAxisId="left" dataKey="stock" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} name={t("productos.campo.stock")} />
                        <Bar yAxisId="right" dataKey="value" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} name={t("grafico.valor")} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Alertas de stock bajo */}
            {lowStockCount > 0 && (
                <div className="bg-warning-surface border border-warning rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
                        <h2 className="text-sm font-semibold text-warning">
                            {tn("dashboard.alerta", lowStockCount)}
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
                                    {t("dashboard.unidadesMinimo", { stock: p.stock, minimo: p.minStock })}
                                </span>
                            </div>
                        ))}
                        {lowStockCount > 5 && (
                            <Link to="/reports" className="text-xs text-warning hover:underline">
                                {t("dashboard.verMas", { cantidad: lowStockCount - 5 })}
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <div className="text-right">
                <Link to="/catalog/products" className="text-sm text-info hover:underline">
                    {t("dashboard.gestionarProductos")}
                </Link>
            </div>
        </div>
    );
}
