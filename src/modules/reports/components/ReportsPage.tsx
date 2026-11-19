import { conSimboloDeMoneda, formatearImporte } from "@/shared/lib/moneda";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { EsqueletoPagina } from "@/shared/components/Esqueleto";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { ReintentoEnLinea } from "@/shared/components/ReintentoEnLinea";
import { Badge } from "@/shared/components/Badge";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { NIVEL_STOCK, nivelDeStock } from "@/shared/lib/estados";
import { Button } from "@/shared/components/Button";
import { useReports } from "@/modules/reports/hooks/useReports";
import { downloadReportPdf } from "@/modules/reports/api/reports.api";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP, TEXTO_DE_EJE } from "@/shared/lib/grafico";
import { ExclamationTriangleIcon, ArrowDownTrayIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { MargenRealizado } from "./MargenRealizado";
import { formatearHora, LOCALE_DE_GRAFICO } from "@/shared/lib/fechas";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO } from "@/shared/lib/clasesDeMarco";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

/** Alto de un gráfico de barras horizontales: el de una fila por categoría, con un mínimo. */
function alturaDeBarras(filas: number) {
    return Math.max(160, filas * 32 + 40);
}

/**
 * AUD-015 — las cifras de un gráfico, para el lector de pantalla. El gráfico va con
 * `aria-hidden`; esta tabla es lo que se lee en su lugar. Se nombra con el `h2` de su sección
 * (`aria-labelledby`): con un `caption` igual, el título se oía dos veces seguidas.
 */
function TablaParaLector({ etiquetadaPor, columnas, filas }: { etiquetadaPor: string; columnas: string[]; filas: (string | number)[][] }) {
    return (
        // Con las clases de todas las tablas (`desbordes.test.ts`); `sr-only` en el contenedor la
        // saca de la vista sin sacarla del árbol de accesibilidad.
        <div className={cn(CLASES_TABLA_DESPLAZABLE, "sr-only")}>
            <table className={CLASES_TABLA} aria-labelledby={etiquetadaPor}>
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

/**
 * AUD-015 — el nombre de un producto en una tabla lleva a sus movimientos. En táctil, con el alto
 * mínimo (medían 37 px); con ratón, el de su texto.
 */
const CLASES_ENLACE_DE_PRODUCTO = cn(CLASES_ENLACE_SUELTO, "font-medium text-foreground hover:text-info hover:underline");

/** AUD-015 — la rotación enseña los primeros; el resto, a petición (eran ~25 filas abiertas). */
const ROTACION_VISIBLE = 10;

/** AUD-015 — por debajo de esto, el % de margen se pinta en ámbar: cuenta menos de lo que parece. */
const COBERTURA_SUFICIENTE = 0.8;

const CLASES_CABECERA = "bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted";

export default function ReportsPage() {
    const { t, tn, idioma } = useT();
    const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useReports();
    const [rotacionCompleta, setRotacionCompleta] = useState(false);

    // AUD-015, crítica de cierre — sin datos, un fallo se dice y se reintenta: antes la página se
    // quedaba en blanco (`return null`) y parecía vacía, no rota (design-system §8).
    if (isLoading) return <EsqueletoPagina cifras={4} />;
    if (!data) {
        return isError ? (
            <div className={CLASES_CONTENEDOR_DE_PAGINA}>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.reportes")}</h1>
                <ErrorDeCarga
                    titulo={t("reportes.errorDeCarga")}
                    error={error}
                    onReintentar={() => void refetch()}
                    reintentando={isFetching}
                    className="mt-6 rounded-xl border border-border bg-surface p-5"
                />
            </div>
        ) : (
            <EsqueletoPagina cifras={4} />
        );
    }

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

    // Consolidar movimientos por mes para el chart. AUD-015 — en el eje, solo el mes: «Jun 26» se
    // leía como el 26 de junio. El año sale en enero y en el primero; la tabla lleva el mes entero.
    const fmtMonth = (m: string, formato: "short" | "long", conAnio = true) => {
        const [y, mo] = m.split("-");
        const texto = new Date(+y, +mo - 1, 1).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], {
            month: formato,
            ...(conAnio && { year: "numeric" }),
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
        const conAnio = month === months[0] || month.endsWith("-01");
        return { month: fmtMonth(month, "short", conAnio), mesLargo: fmtMonth(month, "long"), entradas: ins, salidas: outs, ajustes: adj };
    });

    // AUD-015 — el % de margen solo cuenta lo vendido con coste. Si es una parte pequeña, la tarjeta
    // lo dice: un 12,3 % calculado sobre el 38 % de las ventas se leía como el margen del negocio.
    const vendidoConCoste = importes ? importes.margin.revenue : 0;
    const vendidoTotal = importes ? importes.margin.revenue + importes.margin.revenueWithoutCost : 0;
    const cobertura = vendidoTotal > 0 ? vendidoConCoste / vendidoTotal : 1;

    const conSalidas = stockMetrics?.filter((m) => m.totalOutLast30Days > 0) ?? [];
    const rotacionVisible = rotacionCompleta ? conSalidas : conSalidas.slice(0, ROTACION_VISIBLE);

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-8")}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.reportes")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("reportes.subtitulo")}</p>
                    {/* Con datos en pantalla, un fallo al actualizar no los borra: se dice de cuándo
                        son y se reintenta (el patrón del panel). */}
                    <p role="status" className="text-sm">
                        {isError && (
                            <span className="text-warning">
                                {t("dashboard.noActualizado", { hora: formatearHora(idioma, dataUpdatedAt) })}{" "}
                                <ReintentoEnLinea onReintentar={() => void refetch()} reintentando={isFetching} />
                            </span>
                        )}
                    </p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {/* T5-09 — «cuánto vendimos en marzo» no cabe en esta foto del momento. */}
                    <Link to="/reports/period" className={clasesDeBoton("secondary")}>
                        <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                        {t("reportes.porPeriodo")}
                    </Link>
                    <Button variant="secondary" onClick={downloadReportPdf}>
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                        {t("reportes.descargarPdf")}
                    </Button>
                </div>
            </div>

            {/* KPIs. AUD-015 — las dos filas, iguales: la primera llevaba un icono de adorno y la
                segunda no, y el icono dejaba 100 px para la etiqueta a 390 («Total de» /
                «productos»). Lo único que era estado, el stock bajo, lo dice con su icono y su color. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: t("dashboard.totalProductos"), value: totals.totalProducts },
                    { label: t("dashboard.productosActivos"), value: totals.activeProducts },
                    { label: t("reportes.bajoStock"), value: lowStockProducts.length, aviso: lowStockProducts.length > 0 },
                    importes
                        ? { label: t("reportes.valorInventario"), value: formatearImporte(importes.inventoryValue, { decimales: 0 }) }
                        : { label: t("ruta.categorias"), value: totals.categoryCount },
                ].map(({ label, value, aviso }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                        {/* `text-base` en móvil y no `text-lg`: T2-41 dejó fuera de la escala los
                            tamaños que no sostenían ningún papel (`tipografia.test.ts`). */}
                        <p className={cn("flex items-center gap-1.5 text-base sm:text-xl font-bold tabular-nums", aviso ? "text-warning" : "text-foreground")}>
                            {aviso && <ExclamationTriangleIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden="true" />}
                            {value}
                        </p>
                        <p className="text-xs text-foreground-muted leading-tight">{label}</p>
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
                                ayuda:
                                    importes.margin.revenueWithoutCost > 0
                                        ? t("reportes.coberturaMargen", { porcentaje: Math.round(cobertura * 100) })
                                        : undefined,
                                avisoEnAyuda: cobertura < COBERTURA_SUFICIENTE,
                            },
                        ].map(({ label, value, ayuda, avisoEnAyuda }) => (
                            <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                                <p className="text-base sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
                                <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                                {ayuda && (
                                    <p className={cn("mt-1 text-xs leading-tight tabular-nums wrap-anywhere", avisoEnAyuda ? "text-warning" : "text-foreground-muted")}>
                                        {ayuda}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    {totals.productsWithoutCost > 0 && (
                        <p className="mt-2 text-xs text-warning">
                            {tn("dashboard.sinCoste", totals.productsWithoutCost)}{" "}
                            {/* El mismo enlace que en el panel: adónde ir a ponerles coste. */}
                            <Link to="/catalog/products?aviso=sinCoste" className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "font-medium")}>
                                {t("dashboard.sinCoste.ver")}
                            </Link>
                        </p>
                    )}
                </div>
            )}

            {/* AUD-015, crítica de cierre — lo que pide actuar, justo debajo de las cifras: estaba a
                ~3 000 px, detrás de los gráficos y de los tops. */}
            {/* Productos con stock bajo */}
            {lowStockProducts.length > 0 && (
                <section aria-labelledby="reportes-stock-bajo" className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 id="reportes-stock-bajo" className="text-base font-semibold text-foreground">
                            {t("reportes.stockBajoTabla", { cantidad: lowStockProducts.length })}
                        </h2>
                    </div>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA} aria-labelledby="reportes-stock-bajo">
                            <thead className={CLASES_CABECERA}>
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
                                            <Link to={`/catalog/products/${p.id}/movements`} className={CLASES_ENLACE_DE_PRODUCTO}>
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
                </section>
            )}

            {/* Métricas de rotación de stock */}
            {conSalidas.length > 0 && (
                <section aria-labelledby="reportes-rotacion" className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="flex flex-col gap-2 px-6 py-4 border-b border-border sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 id="reportes-rotacion" className="text-base font-semibold text-foreground">{t("reportes.rotacion")}</h2>
                            <p className="text-xs text-foreground-muted mt-0.5">{t("reportes.rotacionAyuda")}</p>
                        </div>
                        {/* AUD-015 — de «reabastecer pronto» a reponer, sin buscar dónde. La pantalla
                            de sugerencias es de ADMIN, como los importes de esta. */}
                        {importes && conSalidas.some((m) => m.reorderSoon) && (
                            <Link to="/purchase-orders/suggestions" className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "shrink-0 text-sm font-medium")}>
                                {t("reportes.verReposicion")}
                            </Link>
                        )}
                    </div>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA} aria-labelledby="reportes-rotacion">
                            <thead className={CLASES_CABECERA}>
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
                                {rotacionVisible
                                    .map((m) => (
                                        <tr key={m.productId} className={m.reorderSoon ? "bg-warning-surface/40 hover:bg-warning-surface" : "hover:bg-surface-muted"}>
                                            <td className="px-6 py-3 min-w-48">
                                                <Link to={`/catalog/products/${m.productId}/movements`} className={CLASES_ENLACE_DE_PRODUCTO}>
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
                    {conSalidas.length > ROTACION_VISIBLE && (
                        <div className="border-t border-border px-6 py-2">
                            <Button variant="ghost" aria-expanded={rotacionCompleta} onClick={() => setRotacionCompleta((v) => !v)}>
                                {rotacionCompleta
                                    ? t("reportes.rotacion.verMenos", { cantidad: ROTACION_VISIBLE })
                                    : t("reportes.rotacion.verTodos", { cantidad: conSalidas.length })}
                            </Button>
                        </div>
                    )}
                </section>
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
                            etiquetadaPor="valor-por-categoria"
                            columnas={[t("productos.campo.categoria"), t("grafico.valor")]}
                            filas={porValor.map((c) => [c.name, formatearImporte(c.value ?? 0)])}
                        />
                    </section>
                )}

                <section aria-labelledby="distribucion-de-stock" className="bg-surface rounded-xl border border-border p-6">
                    <h2 id="distribucion-de-stock" className="text-base font-semibold text-foreground mb-6">{t("reportes.distribucion")}</h2>
                    <div aria-hidden="true">
                        <ResponsiveContainer width="100%" height={alturaDeBarras(porStock.length)}>
                            <BarChart data={porStock} layout="vertical" margin={{ left: 0, right: 28 }} accessibilityLayer={false}>
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
                        etiquetadaPor="distribucion-de-stock"
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
                    <h2 id="movimientos-por-mes" className="text-base font-semibold text-foreground">{t("reportes.movimientosPorMes")}</h2>
                    {/* AUD-015 — cuenta movimientos (`COUNT(*)`), no unidades: una entrada de 500 vale 1. */}
                    <p className="mb-6 text-xs text-foreground-muted">{t("reportes.movimientosPorMesAyuda")}</p>
                    <div aria-hidden="true">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={movementsChartData} margin={{ left: -20 }} accessibilityLayer={false}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} vertical={false} />
                                <XAxis dataKey="month" tick={TEXTO_DE_EJE} interval={0} />
                                <YAxis tick={TEXTO_DE_EJE} allowDecimals={false} />
                                <Tooltip contentStyle={ESTILO_DE_TOOLTIP} cursor={{ fill: "var(--color-surface-muted)" }} />
                                {/* `itemSorter={null}`: en el orden de las barras; por defecto, alfabético. */}
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} itemSorter={null} />
                                <Bar dataKey="entradas" fill="var(--color-success)" radius={[4, 4, 0, 0]} name={t("grafico.entradas")} />
                                <Bar dataKey="salidas" fill="var(--color-danger)" radius={[4, 4, 0, 0]} name={t("grafico.salidas")} />
                                <Bar dataKey="ajustes" fill="var(--color-info)" radius={[4, 4, 0, 0]} name={t("grafico.ajustes")} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <TablaParaLector
                        etiquetadaPor="movimientos-por-mes"
                        columnas={[t("periodo.mes"), t("grafico.entradas"), t("grafico.salidas"), t("grafico.ajustes")]}
                        filas={movementsChartData.map((m) => [m.mesLargo, m.entradas, m.salidas, m.ajustes])}
                    />
                </section>
            )}

            {/* Top 10 por valor */}
            {topByValue && topByValue.length > 0 && (
                <section aria-labelledby="reportes-top-valor" className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 id="reportes-top-valor" className="text-base font-semibold text-foreground">{t("reportes.topPorValor")}</h2>
                    </div>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA} aria-labelledby="reportes-top-valor">
                            <thead className={CLASES_CABECERA}>
                                <tr>
                                    <th className="px-6 py-3">{t("ordenes.producto")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.precioUnitario")}</th>
                                    <th className="px-6 py-3 text-right">{t("productos.campo.stock")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.valorTotal")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {topByValue!.map((p) => (
                                    <tr key={p.id} className="hover:bg-surface-muted">
                                        <td className="px-6 py-3">
                                            <Link to={`/catalog/products/${p.id}/movements`} className={CLASES_ENLACE_DE_PRODUCTO}>
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
                </section>
            )}

        </div>
    );
}
