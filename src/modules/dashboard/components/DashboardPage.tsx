import { conSimboloDeMoneda, formatearImporte } from "@/shared/lib/moneda";
import { useReports } from "@/modules/reports/hooks/useReports";
import { EsqueletoPagina } from "@/shared/components/Esqueleto";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import {
    CubeIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    TagIcon,
    CurrencyDollarIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { cn } from "@/shared/lib/cn";
import { formatearDia, formatearDiaDeSemana, formatearHora } from "@/shared/lib/fechas";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { AtencionDeHoy } from "./AtencionDeHoy";
import { PanelDeVendedor } from "./PanelDeVendedor";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { FilaDeAtencion } from "../hooks/useAtencionDeHoy";

type Rol = "ADMIN" | "USER" | "WAREHOUSE";

/**
 * Qué ve cada rol en el panel. Cada uno abre Stockly para un trabajo distinto: quien está en el
 * almacén necesita caducidades y conteos, no el margen; quien compra y vende, sus órdenes. Los
 * importes del negocio —valor del inventario, margen, valor por categoría— son de ADMIN.
 * SELLER no está aquí: tiene su propio panel (`PanelDeVendedor`).
 */
const PANEL: Record<Rol, { atencion: readonly FilaDeAtencion[]; importes: boolean; ventas: boolean }> = {
    ADMIN: { atencion: ["stock", "caducidades", "conteos", "compras", "ventas"], importes: true, ventas: true },
    USER: { atencion: ["stock", "compras", "ventas"], importes: false, ventas: true },
    WAREHOUSE: { atencion: ["stock", "caducidades", "conteos", "compras"], importes: false, ventas: false },
};

export default function DashboardPage() {
    const { t } = useT();
    const { user } = useAuth();

    if (user?.role === "SELLER") {
        return (
            <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.dashboard")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("dashboard.vendedor.subtitulo")}</p>
                </div>
                <PanelDeVendedor email={user.email} />
            </div>
        );
    }

    // Un rol que no está en la tabla —no debería llegar ninguno con sesión— ve lo mínimo, no lo de ADMIN.
    const rol: Rol = user?.role === "ADMIN" || user?.role === "WAREHOUSE" ? user.role : "USER";
    return <PanelGeneral rol={rol} />;
}

function PanelGeneral({ rol }: { rol: Rol }) {
    const { t, tn, idioma } = useT();
    const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useReports();
    const panel = PANEL[rol];

    // Sin datos y con error: el esqueleto se quedaba para siempre y la pantalla parecía lenta,
    // no rota. Ahora dice qué falló y deja reintentar sin recargar. «Necesita atención» se queda:
    // sus otras cifras no dependen de `/reports`, y lo pendiente de hoy es lo último que conviene
    // esconder. Solo su fila de stock, que sí sale de ahí, dice «no disponible».
    if (isError && !data) {
        return (
            <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.dashboard")}</h1>
                <AtencionDeHoy filas={panel.atencion} stock={{ valor: null, cargando: false, error: true }} lowStockProducts={[]} />
                <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                    <ErrorDeCarga
                        titulo={t("dashboard.error.titulo")}
                        error={error}
                        onReintentar={() => void refetch()}
                        reintentando={isFetching}
                    />
                </div>
            </div>
        );
    }

    if (isLoading || !data) {
        return <EsqueletoPagina cifras={4} />;
    }

    const { totals, stockByCategory, lowStockProducts, salesByDay, topSold } = data;
    const ventasDeLaSemana = salesByDay.reduce((suma, d) => suma + d.orders, 0);
    const importeDeLaSemana = salesByDay.reduce((suma, d) => suma + d.revenue, 0);
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
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.dashboard")}</h1>
                <p className="text-sm text-foreground-muted mt-1">
                    {t("dashboard.subtitulo")}
                    {" · "}
                    {/* Con datos ya en pantalla, una actualización fallida no los borra: se avisa
                        de que son los de antes y de cuándo, y se puede volver a intentar. La región
                        `status` está siempre montada —una que nace ya con texto no se anuncia— y
                        solo lleva el aviso: la hora de cada actualización buena no se lee en voz alta. */}
                    <span role="status">
                        {isError && (
                            <span className="text-warning">
                                {t("dashboard.noActualizado", { hora: formatearHora(idioma, dataUpdatedAt) })}{" "}
                                <button type="button" onClick={() => void refetch()} className="font-medium text-info hover:underline">
                                    {t("errorDeCarga.reintentar")}
                                </button>
                            </span>
                        )}
                    </span>
                    {!isError && (
                        <span className="tabular-nums">{t("dashboard.actualizado", { hora: formatearHora(idioma, dataUpdatedAt) })}</span>
                    )}
                </p>
            </div>

            {/* Lo primero, lo que pide actuar hoy. La alerta de stock bajo vivía al final,
                detrás de los dos gráficos: a 1440 px quedaba a unos 1600 px de profundidad. */}
            <AtencionDeHoy
                filas={panel.atencion}
                stock={{ valor: lowStockCount, cargando: false, error: false }}
                lowStockProducts={lowStockProducts}
            />

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
                            <p className={`text-xl sm:text-2xl font-bold tabular-nums wrap-anywhere ${highlight ? "text-warning" : "text-foreground"}`}>{value}</p>
                            <p className="text-xs sm:text-sm text-foreground-muted leading-tight">{t(label)}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Valor del inventario — T5-02: a coste y a precio de venta, cada uno con su
                nombre. Solo había el de venta, rotulado «Valor total», y se leía como lo
                invertido cuando incluye un beneficio que todavía no existe. */}
            {panel.importes && (
                <div className="bg-surface rounded-xl border border-border p-5">
                    <div className="flex items-start gap-4">
                        <div className="rounded-lg p-2.5 shrink-0 bg-success-surface">
                            <CurrencyDollarIcon className="h-6 w-6 text-success" />
                        </div>
                        <dl className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                            {[
                                { clave: "dashboard.valorACoste" as const, valor: totals.inventoryCostValue },
                                { clave: "dashboard.valorInventario" as const, valor: totals.inventoryValue },
                                { clave: "dashboard.margenPotencial" as const, valor: totals.potentialMargin },
                            ].map(({ clave, valor }) => (
                                <div key={clave} className="min-w-0">
                                    <dt className="text-sm text-foreground-muted">{t(clave)}</dt>
                                    {/* El KPI que más se refresca: sin cifras tabulares cambiaba de ancho
                                        con cada actualización, y el bloque entero se movía. */}
                                    <dd className="text-2xl font-bold text-foreground tabular-nums wrap-anywhere">{formatearImporte(valor)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        {totals.productsWithoutCost > 0 ? (
                            <p className="text-warning">{tn("dashboard.sinCoste", totals.productsWithoutCost)}</p>
                        ) : (
                            <span />
                        )}
                        <Link to="/reports" className="inline-flex min-h-11 items-center gap-0.5 text-info hover:underline md:min-h-9">
                            {t("dashboard.verReporte")}
                            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            )}

            {/* T6-09 — las ventas de la semana. El panel era solo de inventario: las ventas
                estaban en Informes y por mes. Son siete días del negocio, del más antiguo a hoy,
                y los que no tuvieron ventas vienen a cero: siempre hay siete barras. */}
            {panel.ventas && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <section aria-labelledby="ventas-de-la-semana" className="bg-surface rounded-xl border border-border p-6 lg:col-span-2">
                        <h2 id="ventas-de-la-semana" className="text-base font-semibold text-foreground">{t("dashboard.ventas.titulo")}</h2>
                        <p className="mt-1 text-sm text-foreground tabular-nums">
                            {tn("dashboard.ventas.total", ventasDeLaSemana, { importe: formatearImporte(importeDeLaSemana) })}
                        </p>
                        <p className="mb-6 text-xs text-foreground-muted">{t("dashboard.ventas.nota")}</p>
                        {/* El gráfico es para la vista; las mismas cifras van en una lista para quien
                            no lo ve: de un SVG de Recharts no llega nada útil al árbol de accesibilidad. */}
                        <div aria-hidden="true">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={salesByDay} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                                    <XAxis dataKey="day" interval={0} tick={{ fontSize: 11 }} tickFormatter={(dia: string) => formatearDiaDeSemana(idioma, dia)} />
                                    <YAxis
                                        tick={{ fontSize: 12 }}
                                        width={56}
                                        tickFormatter={(v: number) => conSimboloDeMoneda(v >= 1000 ? `${(v / 1000).toFixed(v >= 10_000 ? 0 : 1)}k` : String(v))}
                                    />
                                    <Tooltip
                                        contentStyle={ESTILO_DE_TOOLTIP}
                                        labelFormatter={(dia) => formatearDia(idioma, String(dia))}
                                        formatter={(value) => [formatearImporte(Number(value)), t("dashboard.ventas.importe")]}
                                    />
                                    <Bar dataKey="revenue" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} name={t("dashboard.ventas.importe")} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <ul className="sr-only" aria-label={t("dashboard.ventas.porDia")}>
                            {salesByDay.map((d) => (
                                <li key={d.day}>
                                    {tn("dashboard.ventas.delDia", d.orders, { dia: formatearDia(idioma, d.day), importe: formatearImporte(d.revenue) })}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section aria-labelledby="mas-vendidos" className="bg-surface rounded-xl border border-border p-6">
                        <h2 id="mas-vendidos" className="text-base font-semibold text-foreground mb-4">{t("dashboard.masVendidos.titulo")}</h2>
                        {topSold.length === 0 ? (
                            <p className="text-sm text-foreground-muted">{t("dashboard.masVendidos.vacio")}</p>
                        ) : (
                            <ol className="space-y-3">
                                {topSold.map((p) => (
                                    // El nombre es el congelado en la línea de venta, y no se repite
                                    // en esta lista: el servidor agrupa por él.
                                    <li key={p.name} className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate font-medium text-foreground">{p.name}</span>
                                        <span className="shrink-0 text-right tabular-nums text-foreground-muted">
                                            {tn("dashboard.masVendidos.unidades", p.units)} · {formatearImporte(p.revenue)}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </div>
            )}

            {/* Gráfico stock por categoría: lleva el valor en dinero, así que es de quien ve importes. */}
            {panel.importes && (
                <div className="bg-surface rounded-xl border border-border p-6">
                    <h2 className="text-base font-semibold text-foreground mb-6">{t("dashboard.stockPorCategoria")}</h2>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={stockByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => conSimboloDeMoneda(`${(v / 1000).toFixed(0)}k`)} />
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
            )}
        </div>
    );
}
