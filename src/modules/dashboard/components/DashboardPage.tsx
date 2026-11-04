import { conSimboloDeMoneda, formatearImporte } from "@/shared/lib/moneda";
import { useReports } from "@/modules/reports/hooks/useReports";
import { EsqueletoPagina } from "@/shared/components/Esqueleto";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
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
    // AUD-008, paso 5 (`quieter`): eran cuatro tarjetas, cada una con su fondo de color —azul,
    // verde, ámbar, gris— para cifras que no son estados (design-system, «el color comunica
    // estado»). «Stock bajo» repetía la primera fila de «Necesita atención», y su tarjeta
    // resaltada mezclaba `bg-surface` con `bg-warning-surface/30`. Quedan tres recuentos del
    // catálogo, neutros, en una sola franja: dicen qué hay, no qué hacer.
    const catalogo: { label: Clave; value: number; to: string }[] = [
        { label: "dashboard.totalProductos", value: totals.totalProducts, to: "/catalog/products" },
        { label: "dashboard.productosActivos", value: totals.activeProducts, to: "/catalog/products" },
        { label: "ruta.categorias", value: stockByCategory.length, to: "/catalog/categories" },
    ];
    const importes: { clave: Clave; valor: number; ayuda?: Clave }[] = [
        { clave: "dashboard.valorACoste", valor: totals.inventoryCostValue },
        { clave: "dashboard.valorInventario", valor: totals.inventoryValue },
        // Paso 6: el margen no es «venta menos coste» de las otras dos cifras —la de venta
        // incluye los productos sin coste—, así que dice qué cuenta.
        { clave: "dashboard.margenPotencial", valor: totals.potentialMargin, ayuda: "dashboard.margenPotencial.ayuda" },
    ];

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.dashboard")}</h1>
                {/* AUD-008, paso 6: el subtítulo decía «Resumen general del inventario», que no
                    contaba nada que el título y la pantalla no dijeran ya. Queda lo que sí informa:
                    de cuándo son los datos. */}
                <p className="text-sm text-foreground-muted mt-1">
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

            {/* Los recuentos del catálogo. Tres columnas también en móvil: con dos, la tercera
                se quedaba sola en una fila. Al pasar el ratón se subraya la etiqueta, como
                cualquier otro enlace; antes aparecía una sombra que no decía nada. */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
                {catalogo.map(({ label, value, to }) => (
                    // Arriba y no centradas: a 390 px «Productos activos» parte en dos líneas, y
                    // centrando, su cifra subía y dejaba de alinearse con las otras dos.
                    <Link key={label} to={to} className="group flex min-h-11 min-w-0 flex-col gap-0.5 px-3 py-3 sm:px-6 sm:py-4">
                        <span className="text-xl font-semibold tabular-nums text-foreground wrap-anywhere sm:text-2xl">{value}</span>
                        <span className="text-xs leading-tight text-foreground-muted group-hover:underline sm:text-sm">{t(label)}</span>
                    </Link>
                ))}
            </div>

            {/* Valor del inventario — T5-02: a coste y a precio de venta, cada uno con su
                nombre. Solo había el de venta, rotulado «Valor total», y se leía como lo
                invertido cuando incluye un beneficio que todavía no existe. Sin el icono de
                dólar sobre fondo verde (paso 5): el verde es «éxito», y aquí no hay ninguno.
                `p-5 sm:p-6` (polish), como el resto de bloques del panel: con `p-5` a secas sus
                cifras arrancaban 4 px a la izquierda de los demás títulos. */}
            {panel.importes && (
                <div className="bg-surface rounded-xl border border-border p-5 sm:p-6">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {importes.map(({ clave, valor, ayuda }) => (
                            <div key={clave} className="min-w-0">
                                <dt className="text-sm text-foreground-muted">{t(clave)}</dt>
                                {/* El KPI que más se refresca: sin cifras tabulares cambiaba de ancho
                                    con cada actualización, y el bloque entero se movía. Semibold, como
                                    las cifras del catálogo: el negrita competía con «Necesita atención». */}
                                <dd className="text-2xl font-semibold text-foreground tabular-nums wrap-anywhere">{formatearImporte(valor)}</dd>
                                {ayuda && <dd className="text-xs text-foreground-muted">{t(ayuda)}</dd>}
                            </div>
                        ))}
                    </dl>
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
                    <section aria-labelledby="ventas-de-la-semana" className="bg-surface rounded-xl border border-border p-5 sm:p-6 lg:col-span-2">
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

                    <section aria-labelledby="mas-vendidos" className="bg-surface rounded-xl border border-border p-5 sm:p-6">
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

            {/* AUD-008, paso 4 — aquí iba «Stock y valor por categoría»: dos medidas en un gráfico,
                con doble eje sin leyenda, el derecho en «$0k», 3 de 9 categorías a 390 px y nada
                para el lector de pantalla. Es análisis, no lo pendiente de hoy, e Informes ya da
                las dos medidas por separado y bien («Valor por categoría» y «Distribución»): se
                llega por «Ver reporte completo», en el bloque de importes. */}
        </div>
    );
}
