import { conSimboloDeMoneda, formatearImporte } from "@/shared/lib/moneda";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { EsqueletoPagina } from "@/shared/components/Esqueleto";
import { Badge } from "@/shared/components/Badge";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { NIVEL_STOCK, nivelDeStock } from "@/shared/lib/estados";
import { Button } from "@/shared/components/Button";
import { useReports } from "@/modules/reports/hooks/useReports";
import { downloadReportPdf } from "@/modules/reports/api/reports.api";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP, TEXTO_DE_EJE } from "@/shared/lib/grafico";
import {
    CubeIcon,
    CurrencyDollarIcon,
    TagIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { MargenRealizado } from "./MargenRealizado";
import { LOCALE_DE_GRAFICO } from "@/shared/lib/fechas";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { cn } from "@/shared/lib/cn";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

/** Alto de un gráfico de barras horizontales: el de una fila por categoría, con un mínimo. */
function alturaDeBarras(filas: number) {
    return Math.max(160, filas * 32 + 40);
}

/**
 * AUD-015 — las cifras de un gráfico, para el lector de pantalla. El gráfico va con
 * `aria-hidden`; esta tabla es lo que se lee en su lugar, con su título como leyenda.
 */
function TablaParaLector({ titulo, columnas, filas }: { titulo: string; columnas: string[]; filas: (string | number)[][] }) {
    return (
        // Con las clases de todas las tablas (`desbordes.test.ts`); `sr-only` en el contenedor la
        // saca de la vista sin sacarla del árbol de accesibilidad.
        <div className={cn(CLASES_TABLA_DESPLAZABLE, "sr-only")}>
            <table className={CLASES_TABLA}>
                <caption>{titulo}</caption>
                <thead>
                    <tr>
                        {columnas.map((c) => (
                            <th key={c} scope="col">{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {filas.map(([primera, ...resto]) => (
                        <tr key={String(primera)}>
                            <th scope="row">{primera}</th>
                            {resto.map((celda, i) => (
                                <td key={i}>{celda}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ReportsPage() {
    const { t, tn, idioma } = useT();
    const { data, isLoading } = useReports();

    if (isLoading) {
        return <EsqueletoPagina cifras={4} />;
    }

    if (!data) return null;

    const { totals, stockByCategory, topByValue, movementsByMonth, movementMonths, lowStockProducts, stockMetrics, margin } = data;
    // AUD-009 — los importes solo le llegan a ADMIN. Para los demás roles no vienen (no a cero:
    // no vienen), y la pantalla enseña lo que sí: recuentos, unidades, movimientos y rotación.
    const importes =
        totals.inventoryValue !== undefined && totals.inventoryCostValue !== undefined && totals.potentialMargin !== undefined && margin
            ? {
                  inventoryValue: totals.inventoryValue,
                  inventoryCostValue: totals.inventoryCostValue,
                  // Un backend anterior a AUD-015 no la manda: se deduce de la resta, que es de donde sale.
                  costedSaleValue: totals.costedSaleValue ?? totals.potentialMargin + totals.inventoryCostValue,
                  potentialMargin: totals.potentialMargin,
                  margin,
              }
            : null;

    // Las categorías de más a menos, en los dos gráficos: una barra ordenada se compara sin leer.
    const porValor = [...stockByCategory].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const porStock = [...stockByCategory].sort((a, b) => b.stock - a.stock);
    const stockTotal = stockByCategory.reduce((suma, c) => suma + c.stock, 0);

    // Consolidar movimientos por mes para el chart
    const fmtMonth = (m: string, formato: "short" | "long") => {
        const [y, mo] = m.split("-");
        const texto = new Date(+y, +mo - 1, 1).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], {
            month: formato,
            year: formato === "short" ? "2-digit" : "numeric",
        });
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    };

    // AUD-015 — los meses los dice el servidor, los seis, con o sin movimientos. Un backend
    // anterior no manda la lista: entonces, como antes, los que traen filas.
    const months = movementMonths ?? [...new Set(movementsByMonth.map((m) => m.month))].sort();
    const movementsChartData = months.map((month) => {
        const ins = movementsByMonth.find((m) => m.month === month && m.type === "IN")?.total ?? 0;
        const outs = movementsByMonth.find((m) => m.month === month && m.type === "OUT")?.total ?? 0;
        const adj = movementsByMonth.find((m) => m.month === month && m.type === "ADJUSTMENT")?.total ?? 0;
        return { month: fmtMonth(month, "short"), mesLargo: fmtMonth(month, "long"), entradas: ins, salidas: outs, ajustes: adj };
    });

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-8")}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.reportes")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("reportes.subtitulo")}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {/* T5-09 — «cuánto vendimos en marzo» no cabe en esta foto del momento. */}
                    <Link to="/reports/period" className={clasesDeBoton("secondary")}>
                        <CalendarDaysIcon className="h-4 w-4" />
                        {t("reportes.porPeriodo")}
                    </Link>
                    <Button variant="secondary" onClick={downloadReportPdf}>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t("reportes.descargarPdf")}
                    </Button>
                </div>
            </div>

            {/* KPIs — mismas dos densidades que las del dashboard, que ya las tenía y estas
                no: a 412 px, `p-5` con un icono de 24 px dejaba 70 px para el número y
                `$2.211.974` se salía de la tarjeta por la derecha. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: t("dashboard.totalProductos"), value: totals.totalProducts, Icon: CubeIcon, bg: "bg-info-surface", text: "text-info" },
                    { label: t("dashboard.productosActivos"), value: totals.activeProducts, Icon: CheckCircleIcon, bg: "bg-success-surface", text: "text-success" },
                    { label: t("reportes.bajoStock"), value: lowStockProducts.length, Icon: ExclamationTriangleIcon, bg: "bg-warning-surface", text: "text-warning" },
                    importes
                        ? {
                              label: t("reportes.valorInventario"),
                              value: formatearImporte(importes.inventoryValue, { decimales: 0 }),
                              Icon: CurrencyDollarIcon,
                              bg: "bg-success-surface",
                              text: "text-success",
                          }
                        : { label: t("ruta.categorias"), value: totals.categoryCount, Icon: TagIcon, bg: "bg-info-surface", text: "text-info" },
                ].map(({ label, value, Icon, bg, text }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 flex items-center gap-3 sm:gap-4">
                        <div className={`rounded-lg p-2 sm:p-2.5 shrink-0 ${bg}`}>
                            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${text}`} />
                        </div>
                        {/* `min-w-0`: sin esto el bloque de texto no puede encoger por debajo
                            de su contenido —regla de los elementos flex— y el importe se sale
                            de la tarjeta en vez de ajustarse a ella. */}
                        <div className="min-w-0">
                            {/* `text-base` en móvil y no `text-lg`: T2-41 dejó fuera de la
                                escala los tamaños que no sostenían ningún papel, y
                                `tipografia.test.ts` lo comprueba. */}
                            <p className="text-base sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
                            <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* T5-02 — segunda fila: lo invertido y lo ganado. Mismas tarjetas que la primera.
                AUD-009 — solo para ADMIN, como el margen realizado de debajo.
                AUD-015 — el valor a coste y el margen potencial solo cuentan los productos con
                coste, y la tarjeta lo dice; el margen enseña de qué resta sale, con la venta de
                esos mismos productos: restar el coste al valor de venta de la primera fila no lo
                daba, porque ese incluye los que no tienen coste. */}
            {importes && (
                <div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {[
                            {
                                label: t("reportes.valorACoste"),
                                value: formatearImporte(importes.inventoryCostValue, { decimales: 0 }),
                                ayuda: totals.productsWithoutCost > 0 ? t("reportes.soloConCoste") : undefined,
                            },
                            {
                                label: t("reportes.margenPotencial"),
                                value: formatearImporte(importes.potentialMargin, { decimales: 0 }),
                                ayuda: t("reportes.margenPotencial.resta", {
                                    venta: formatearImporte(importes.costedSaleValue, { decimales: 0 }),
                                    coste: formatearImporte(importes.inventoryCostValue, { decimales: 0 }),
                                }),
                            },
                            { label: t("reportes.margenPeriodo", { dias: importes.margin.days }), value: formatearImporte(importes.margin.margin, { decimales: 0 }) },
                            {
                                label: t("reportes.porcentajeMargen"),
                                value: importes.margin.marginPercent === null ? "—" : `${importes.margin.marginPercent.toFixed(1)} %`,
                            },
                        ].map(({ label, value, ayuda }) => (
                            <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                                <p className="text-base sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
                                <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                                {ayuda && <p className="mt-1 text-xs text-foreground-muted leading-tight tabular-nums wrap-anywhere">{ayuda}</p>}
                            </div>
                        ))}
                    </div>
                    {totals.productsWithoutCost > 0 && (
                        <p className="mt-2 text-xs text-warning">
                            {tn("dashboard.sinCoste", totals.productsWithoutCost)}{" "}
                            {/* El mismo enlace que en el panel: adónde ir a ponerles coste. */}
                            <Link to="/catalog/products?aviso=sinCoste" className="font-medium text-info underline">
                                {t("dashboard.sinCoste.ver")}
                            </Link>
                        </p>
                    )}
                </div>
            )}

            {importes && <MargenRealizado margen={importes.margin} />}

            {/* AUD-015 — los tres gráficos siguen el patrón del informe por periodo: el dibujo es
                para la vista (`aria-hidden`, y `accessibilityLayer={false}` para que el SVG no
                reciba el foco: era una parada sin nombre con `role="application"`), y las mismas
                cifras van en una tabla para el lector de pantalla. La tarta se fue: con nueve
                categorías y ocho colores, dos porciones compartían color; unas barras
                ordenadas se leen sin leyenda y no se quedan sin colores. */}
            <div className={cn("grid grid-cols-1 gap-6", importes && "lg:grid-cols-2")}>
                {importes && (
                    <section aria-labelledby="valor-por-categoria" className="bg-surface rounded-xl border border-border p-6">
                        <h2 id="valor-por-categoria" className="text-base font-semibold text-foreground mb-6">{t("reportes.valorPorCategoria")}</h2>
                        <div aria-hidden="true">
                            <ResponsiveContainer width="100%" height={alturaDeBarras(porValor.length)}>
                                <BarChart data={porValor} layout="vertical" margin={{ left: 0, right: 20 }} accessibilityLayer={false}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} horizontal={false} />
                                    <XAxis type="number" tick={TEXTO_DE_EJE} tickFormatter={(v) => conSimboloDeMoneda(`${(v / 1000).toFixed(0)}k`)} />
                                    <YAxis type="category" dataKey="name" tick={TEXTO_DE_EJE} width={110} interval={0} />
                                    <Tooltip
                                        formatter={(v) => [formatearImporte(Number(v)), t("grafico.valor")]}
                                        contentStyle={ESTILO_DE_TOOLTIP}
                                        cursor={{ fill: "var(--color-surface-muted)" }}
                                    />
                                    <Bar dataKey="value" fill="var(--color-chart-5)" radius={[0, 4, 4, 0]} name={t("grafico.valor")} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <TablaParaLector
                            titulo={t("reportes.valorPorCategoria")}
                            columnas={[t("productos.campo.categoria"), t("grafico.valor")]}
                            filas={porValor.map((c) => [c.name, formatearImporte(c.value ?? 0)])}
                        />
                    </section>
                )}

                <section aria-labelledby="distribucion-de-stock" className="bg-surface rounded-xl border border-border p-6">
                    <h2 id="distribucion-de-stock" className="text-base font-semibold text-foreground mb-6">{t("reportes.distribucion")}</h2>
                    <div aria-hidden="true">
                        <ResponsiveContainer width="100%" height={alturaDeBarras(porStock.length)}>
                            <BarChart data={porStock} layout="vertical" margin={{ left: 0, right: 20 }} accessibilityLayer={false}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} horizontal={false} />
                                <XAxis type="number" tick={TEXTO_DE_EJE} allowDecimals={false} />
                                <YAxis type="category" dataKey="name" tick={TEXTO_DE_EJE} width={110} interval={0} />
                                <Tooltip
                                    formatter={(v) => [Number(v), t("grafico.unidades")]}
                                    contentStyle={ESTILO_DE_TOOLTIP}
                                    cursor={{ fill: "var(--color-surface-muted)" }}
                                />
                                <Bar dataKey="stock" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} name={t("grafico.unidades")} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <TablaParaLector
                        titulo={t("reportes.distribucion")}
                        columnas={[t("productos.campo.categoria"), t("grafico.unidades"), t("reportes.porcentajeDelStock")]}
                        filas={porStock.map((c) => [c.name, c.stock, `${stockTotal > 0 ? Math.round((c.stock / stockTotal) * 100) : 0} %`])}
                    />
                </section>
            </div>

            {/* Movimientos por mes. AUD-015 — los seis meses siempre en el eje, también los que
                no tuvieron movimientos: antes el eje se hacía con los meses que traían filas y un
                mes vacío desaparecía en vez de verse a cero. */}
            {movementsByMonth.length > 0 && (
                <section aria-labelledby="movimientos-por-mes" className="bg-surface rounded-xl border border-border p-6">
                    <h2 id="movimientos-por-mes" className="text-base font-semibold text-foreground mb-6">{t("reportes.movimientosPorMes")}</h2>
                    <div aria-hidden="true">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={movementsChartData} margin={{ left: -20 }} accessibilityLayer={false}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} vertical={false} />
                                <XAxis dataKey="month" tick={TEXTO_DE_EJE} interval={0} />
                                <YAxis tick={TEXTO_DE_EJE} allowDecimals={false} />
                                <Tooltip contentStyle={ESTILO_DE_TOOLTIP} cursor={{ fill: "var(--color-surface-muted)" }} />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="entradas" fill="var(--color-success)" radius={[4, 4, 0, 0]} name={t("grafico.entradas")} />
                                <Bar dataKey="salidas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} name={t("grafico.salidas")} />
                                <Bar dataKey="ajustes" fill="var(--color-info)" radius={[4, 4, 0, 0]} name={t("grafico.ajustes")} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <TablaParaLector
                        titulo={t("reportes.movimientosPorMes")}
                        columnas={[t("periodo.mes"), t("grafico.entradas"), t("grafico.salidas"), t("grafico.ajustes")]}
                        filas={movementsChartData.map((m) => [m.mesLargo, m.entradas, m.salidas, m.ajustes])}
                    />
                </section>
            )}

            {/* Top 10 por valor */}
            {topByValue && topByValue.length > 0 && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">{t("reportes.topPorValor")}</h2>
                    </div>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
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
                                {topByValue!.map((p, i) => (
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
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
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
                </div>
            )}

            {/* Métricas de rotación de stock */}
            {stockMetrics?.filter((m) => m.totalOutLast30Days > 0).length > 0 && (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="text-base font-semibold text-foreground">{t("reportes.rotacion")}</h2>
                        <p className="text-xs text-foreground-muted mt-0.5">{t("reportes.rotacionAyuda")}</p>
                    </div>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
                            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                <tr>
                                    <th className="px-6 py-3">{t("ordenes.producto")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.salidas30")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.velocidadDiaria")}</th>
                                    <th className="px-6 py-3 text-right">{t("productos.campo.stockActual")}</th>
                                    <th className="px-6 py-3 text-right">{t("productos.disponible")}</th>
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
                                            <td className="px-6 py-3 text-right text-foreground-muted">{m.currentStock}</td>
                                            {/* T5-03 — los días restantes se cuentan sobre esta columna, no sobre la de stock. */}
                                            <td className="px-6 py-3 text-right font-semibold text-foreground">{m.availableStock}</td>
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
                </div>
            )}
        </div>
    );
}
