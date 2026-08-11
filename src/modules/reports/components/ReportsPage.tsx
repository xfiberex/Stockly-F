import { formatearImporte } from "@/shared/lib/moneda";
import { Link } from "react-router-dom";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
} from "recharts";
import { Spinner } from "@/shared/components/Spinner";
import { Badge } from "@/shared/components/Badge";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { NIVEL_STOCK, nivelDeStock } from "@/shared/lib/estados";
import { Button } from "@/shared/components/Button";
import { useReports } from "@/modules/reports/hooks/useReports";
import { downloadReportPdf } from "@/modules/reports/api/reports.api";
import { COLORES_DE_SERIE, COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import {
    CubeIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { LOCALE_DE_GRAFICO } from "@/shared/lib/fechas";

export default function ReportsPage() {
    const { t, idioma } = useT();
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
        return new Date(+y, +mo - 1, 1).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], { month: "short", year: "2-digit" });
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
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.reportes")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("reportes.subtitulo")}</p>
                </div>
                <Button variant="secondary" onClick={downloadReportPdf}>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {t("reportes.descargarPdf")}
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t("dashboard.totalProductos"), value: totals.totalProducts, Icon: CubeIcon, bg: "bg-info-surface", text: "text-info" },
                    { label: t("dashboard.productosActivos"), value: totals.activeProducts, Icon: CheckCircleIcon, bg: "bg-success-surface", text: "text-success" },
                    { label: t("reportes.bajoStock"), value: lowStockProducts.length, Icon: ExclamationTriangleIcon, bg: "bg-warning-surface", text: "text-warning" },
                    {
                        label: t("reportes.valorInventario"),
                        value: formatearImporte(totals.inventoryValue, { decimales: 0 }),
                        Icon: CurrencyDollarIcon,
                        bg: "bg-success-surface",
                        text: "text-success",
                    },
                ].map(({ label, value, Icon, bg, text }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4">
                        <div className={`rounded-lg p-2.5 shrink-0 ${bg}`}>
                            <Icon className={`h-6 w-6 ${text}`} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
                            <p className="text-xs text-foreground-muted">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Valor por categoría + distribución */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface rounded-xl border border-border p-6">
                    <h2 className="text-base font-semibold text-foreground mb-6">{t("reportes.valorPorCategoria")}</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stockByCategory} layout="vertical" margin={{ left: 60, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={55} />
                            <Tooltip
                                formatter={(v) => [formatearImporte(Number(v)), t("grafico.valor")]}
                                contentStyle={ESTILO_DE_TOOLTIP}
                            />
                            <Bar dataKey="value" fill="var(--color-chart-5)" radius={[0, 4, 4, 0]} name={t("grafico.valor")} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-surface rounded-xl border border-border p-6">
                    <h2 className="text-base font-semibold text-foreground mb-6">{t("reportes.distribucion")}</h2>
                    <ResponsiveContainer width="100%" height={290}>
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <Pie
                                data={stockByCategory}
                                dataKey="stock"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                // Radio en porcentaje, no en píxeles: la leyenda ocupa una o dos
                                // filas según el ancho, y con `outerRadius={90}` fijo la tarta no
                                // encogía al reducirse el área — se salía por arriba del SVG, que
                                // no recorta, y las etiquetas acababan encima del título.
                                outerRadius="70%"
                                // Solo el porcentaje: los nombres los da la leyenda. «Almacenamiento
                                // (19%)» dibujado fuera del arco se sale por los lados en cuanto la
                                // tarjeta se estrecha, y las porciones pequeñas se pisaban entre sí.
                                // Por debajo del 5% no cabe ni el porcentaje: se calla.
                                label={({ percent }) =>
                                    (percent ?? 0) < 0.05 ? "" : `${((percent ?? 0) * 100).toFixed(0)}%`
                                }
                                labelLine={false}
                            >
                                {stockByCategory.map((_, i) => (
                                    <Cell key={i} fill={COLORES_DE_SERIE[i % COLORES_DE_SERIE.length]} />
                                ))}
                            </Pie>
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                            <Tooltip formatter={(v) => [Number(v), t("grafico.unidades")]} contentStyle={ESTILO_DE_TOOLTIP} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Movimientos por mes */}
            {movementsChartData.length > 0 && (
                <div className="bg-surface rounded-xl border border-border p-6">
                    <h2 className="text-base font-semibold text-foreground mb-6">{t("reportes.movimientosPorMes")}</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={movementsChartData} margin={{ left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip contentStyle={ESTILO_DE_TOOLTIP} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="entradas" fill="var(--color-success)" radius={[4, 4, 0, 0]} name={t("grafico.entradas")} />
                            <Bar dataKey="salidas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} name={t("grafico.salidas")} />
                            <Bar dataKey="ajustes" fill="var(--color-info)" radius={[4, 4, 0, 0]} name={t("grafico.ajustes")} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Top 10 por valor */}
            {topByValue.length > 0 && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">{t("reportes.topPorValor")}</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-6 py-3">#</th>
                                <th className="px-6 py-3">{t("ordenes.producto")}</th>
                                <th className="px-6 py-3 text-right">{t("reportes.precioUnitario")}</th>
                                <th className="px-6 py-3 text-right">{t("productos.campo.stock")}</th>
                                <th className="px-6 py-3 text-right">{t("reportes.valorTotal")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {topByValue.map((p, i) => (
                                <tr key={p.id} className="hover:bg-surface-muted">
                                    <td className="px-6 py-3 text-foreground-muted font-medium">{i + 1}</td>
                                    <td className="px-6 py-3">
                                        <Link
                                            to={`/catalog/products/${p.id}/movements`}
                                            className="font-medium text-foreground hover:text-info"
                                        >
                                            {p.name}
                                        </Link>
                                        {p.sku && <div className="text-xs text-foreground-muted font-mono">{p.sku}</div>}
                                    </td>
                                    <td className="px-6 py-3 text-right text-foreground-muted">{formatearImporte(p.price)}</td>
                                    <td className="px-6 py-3 text-right text-foreground">{p.stock}</td>
                                    <td className="px-6 py-3 text-right font-semibold text-foreground">
                                        {formatearImporte(p.totalValue)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Productos con stock bajo */}
            {lowStockProducts.length > 0 && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">
                            {t("reportes.stockBajoTabla", { cantidad: lowStockProducts.length })}
                        </h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-6 py-3">{t("ordenes.producto")}</th>
                                <th className="px-6 py-3">{t("productos.campo.categoria")}</th>
                                <th className="px-6 py-3 text-right">{t("productos.campo.stockActual")}</th>
                                <th className="px-6 py-3 text-right">{t("productos.campo.stockMinimo")}</th>
                                <th className="px-6 py-3">{t("comun.estado")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {lowStockProducts.map((p) => (
                                <tr key={p.id} className="hover:bg-surface-muted bg-warning-surface/30">
                                    <td className="px-6 py-3">
                                        <Link
                                            to={`/catalog/products/${p.id}/movements`}
                                            className="font-medium text-foreground hover:text-info"
                                        >
                                            {p.name}
                                        </Link>
                                        {p.sku && <div className="text-xs text-foreground-muted font-mono">{p.sku}</div>}
                                    </td>
                                    <td className="px-6 py-3 text-foreground-muted">{p.category ?? "—"}</td>
                                    <td className="px-6 py-3 text-right font-semibold text-warning">{p.stock}</td>
                                    <td className="px-6 py-3 text-right text-foreground-muted">{p.minStock}</td>
                                    <td className="px-6 py-3">
                                        <EstadoBadge estado={NIVEL_STOCK[nivelDeStock(p.stock, p.minStock)]} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Métricas de rotación de stock */}
            {stockMetrics?.filter((m) => m.totalOutLast30Days > 0).length > 0 && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">{t("reportes.rotacion")}</h2>
                        <p className="text-xs text-foreground-muted mt-0.5">{t("reportes.rotacionAyuda")}</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-6 py-3">{t("ordenes.producto")}</th>
                                <th className="px-6 py-3 text-right">{t("reportes.salidas30")}</th>
                                <th className="px-6 py-3 text-right">{t("reportes.velocidadDiaria")}</th>
                                <th className="px-6 py-3 text-right">{t("productos.campo.stockActual")}</th>
                                <th className="px-6 py-3 text-right">{t("reportes.diasRestantes")}</th>
                                <th className="px-6 py-3">{t("reportes.alerta")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {stockMetrics
                                .filter((m) => m.totalOutLast30Days > 0)
                                .map((m) => (
                                    <tr key={m.productId} className={m.reorderSoon ? "bg-warning-surface/40 hover:bg-warning-surface" : "hover:bg-surface-muted"}>
                                        <td className="px-6 py-3">
                                            <Link
                                                to={`/catalog/products/${m.productId}/movements`}
                                                className="font-medium text-foreground hover:text-info"
                                            >
                                                {m.productName}
                                            </Link>
                                            {m.sku && <div className="text-xs text-foreground-muted font-mono">{m.sku}</div>}
                                        </td>
                                        <td className="px-6 py-3 text-right text-foreground">{m.totalOutLast30Days}</td>
                                        <td className="px-6 py-3 text-right text-foreground-muted">{t("reportes.porDia", { valor: m.dailyVelocity.toFixed(2) })}</td>
                                        <td className="px-6 py-3 text-right font-semibold text-foreground">{m.currentStock}</td>
                                        <td className="px-6 py-3 text-right">
                                            {m.daysToStockout !== null ? (
                                                <span className={m.daysToStockout <= 7 ? "font-semibold text-danger" : m.daysToStockout <= 14 ? "font-medium text-warning" : "text-foreground-muted"}>
                                                    {t("reportes.dias", { cantidad: m.daysToStockout })}
                                                </span>
                                            ) : (
                                                <span className="text-foreground-muted">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3">
                                            {m.reorderSoon ? (
                                                <Badge variant="warning" Icon={ExclamationTriangleIcon}>{t("reportes.reabastecer")}</Badge>
                                            ) : (
                                                <span className="text-foreground-muted text-xs">—</span>
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
