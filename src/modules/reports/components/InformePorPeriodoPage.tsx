import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowDownTrayIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/shared/components/Button";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { formatearImporte } from "@/shared/lib/moneda";
import { formatearDia, LOCALE_DE_GRAFICO } from "@/shared/lib/fechas";
import { COLORES_DE_SERIE, COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { usePeriodReport } from "@/modules/reports/hooks/useReports";
import { downloadPeriodReport, type ConsultaDePeriodo } from "@/modules/reports/api/reports.api";
import type { PeriodPreset } from "@/modules/reports/types/reports.types";

/**
 * Los atajos, en el orden en que se leen. Un mapa y no una clave construida con el valor, como
 * `ROTULO_DE_ORIGEN` en las sugerencias: cada clave queda escrita para el guardián del
 * catálogo, y un atajo nuevo en el contrato no compila hasta tener su rótulo.
 */
const ROTULO_DE_ATAJO: Record<PeriodPreset, Clave> = {
    "this-month": "periodo.atajo.thisMonth",
    "last-month": "periodo.atajo.lastMonth",
    "this-quarter": "periodo.atajo.thisQuarter",
    "this-year": "periodo.atajo.thisYear",
};
const ATAJOS = Object.keys(ROTULO_DE_ATAJO) as PeriodPreset[];

type Cifras = { salesUnits: number; salesRevenue: number; purchaseUnits: number; purchaseAmount: number };

/** Las cuatro columnas de cifras, iguales en las tres tablas. */
function CeldasDeCifras({ fila, fuerte = false }: { fila: Cifras; fuerte?: boolean }) {
    const clase = cn("px-4 py-3 text-right tabular-nums", fuerte ? "font-semibold text-foreground" : "text-foreground-muted");
    return (
        <>
            <td className={clase}>{fila.salesUnits}</td>
            <td className={cn(clase, "text-foreground")}>{formatearImporte(fila.salesRevenue)}</td>
            <td className={clase}>{fila.purchaseUnits}</td>
            <td className={cn(clase, "text-foreground")}>{formatearImporte(fila.purchaseAmount)}</td>
        </>
    );
}

/**
 * T5-09 — ventas enviadas y compras recibidas de un periodo.
 *
 * El periodo se pide como atajo o como rango, y la respuesta trae las fechas ya resueltas por
 * el backend **en la zona del negocio**: «este mes» lo decide el servidor, no el reloj de este
 * navegador. Por eso la pantalla enseña el rango que llegó, no el que calcula ella.
 */
export default function InformePorPeriodoPage() {
    const { t, idioma } = useT();
    const [consulta, setConsulta] = useState<ConsultaDePeriodo>({ preset: "this-month" });
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [errorDeRango, setErrorDeRango] = useState<string>();

    const { data, isLoading } = usePeriodReport(consulta);
    const atajoActivo = "preset" in consulta ? consulta.preset : null;

    const aplicarRango = (e: FormEvent) => {
        e.preventDefault();
        if (!desde || !hasta) return setErrorDeRango(t("periodo.faltanFechas"));
        if (desde > hasta) return setErrorDeRango(t("periodo.rangoInvalido"));
        setErrorDeRango(undefined);
        setConsulta({ from: desde, to: hasta });
    };

    const elegirAtajo = (atajo: PeriodPreset) => {
        setErrorDeRango(undefined);
        setConsulta({ preset: atajo });
    };

    const mesCorto = (mes: string) => {
        const [y, m] = mes.split("-").map(Number);
        return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], { month: "short", year: "2-digit", timeZone: "UTC" });
    };
    const mesLargo = (mes: string) => {
        const [y, m] = mes.split("-").map(Number);
        const texto = new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], { month: "long", year: "numeric", timeZone: "UTC" });
        // Solo la primera letra: la clase `capitalize` sube todas y dejaba «Enero De 2026».
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    };

    const totales = data?.totals;
    const vacio = totales !== undefined && totales.salesUnits === 0 && totales.purchaseUnits === 0;

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <Link to="/reports" className="inline-flex items-center gap-1 text-sm text-info hover:underline">
                <ArrowLeftIcon className="h-4 w-4" />
                {t("periodo.volver")}
            </Link>

            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.informePeriodo")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">
                        {data
                            ? t("periodo.rango", { desde: formatearDia(idioma, data.from), hasta: formatearDia(idioma, data.to), zona: data.timezone })
                            : t("periodo.subtitulo")}
                    </p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    <Button variant="secondary" disabled={!data} onClick={() => data && downloadPeriodReport(data, "csv")}>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t("periodo.exportarCsv")}
                    </Button>
                    <Button variant="secondary" disabled={!data} onClick={() => data && downloadPeriodReport(data, "pdf")}>
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        {t("reportes.descargarPdf")}
                    </Button>
                </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
                <div role="group" aria-label={t("periodo.atajos")} className="flex flex-wrap gap-2">
                    {ATAJOS.map((atajo) => (
                        <Button
                            key={atajo}
                            variant={atajoActivo === atajo ? "primary" : "secondary"}
                            aria-pressed={atajoActivo === atajo}
                            onClick={() => elegirAtajo(atajo)}
                        >
                            {t(ROTULO_DE_ATAJO[atajo])}
                        </Button>
                    ))}
                </div>
                <form onSubmit={aplicarRango} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <CampoDeFecha label={t("periodo.desde")} value={desde} onChange={(e) => setDesde(e.target.value)} />
                    <CampoDeFecha label={t("periodo.hasta")} value={hasta} onChange={(e) => setHasta(e.target.value)} error={errorDeRango} />
                    <Button type="submit" variant={atajoActivo === null ? "primary" : "secondary"}>
                        {t("periodo.aplicar")}
                    </Button>
                </form>
                <p className="text-xs text-foreground-muted">{t("periodo.alcance")}</p>
            </div>

            {isLoading || !data || !totales ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { label: t("periodo.ventas"), value: formatearImporte(totales.salesRevenue) },
                            { label: t("periodo.unidadesVendidas"), value: totales.salesUnits },
                            { label: t("periodo.ordenesEnviadas"), value: totales.salesOrders },
                            { label: t("periodo.compras"), value: formatearImporte(totales.purchaseAmount) },
                            { label: t("periodo.unidadesCompradas"), value: totales.purchaseUnits },
                            { label: t("periodo.ordenesRecibidas"), value: totales.purchaseOrders },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                                <p className="text-base sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
                                <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                            </div>
                        ))}
                    </div>

                    {vacio ? (
                        <div className="py-12 text-center text-sm text-foreground-muted">{t("periodo.vacio")}</div>
                    ) : (
                        <>
                            <section className="bg-surface rounded-xl border border-border">
                                <h2 className="px-4 pt-4 text-base font-semibold text-foreground">{t("periodo.porMes")}</h2>
                                {/* El gráfico solo cuando hay con qué comparar: con un mes son dos barras solas. */}
                                {data.byMonth.length > 1 && (
                                    <div className="h-64 px-2 pt-4" aria-hidden="true">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.byMonth.map((m) => ({ mes: mesCorto(m.month), ventas: m.salesRevenue, compras: m.purchaseAmount }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                                                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} width={70} tickFormatter={(v: number) => formatearImporte(v, { decimales: 0 })} />
                                                <Tooltip contentStyle={ESTILO_DE_TOOLTIP} formatter={(v) => formatearImporte(Number(v))} />
                                                <Legend />
                                                <Bar dataKey="ventas" name={t("periodo.ventas")} fill={COLORES_DE_SERIE[0]} radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="compras" name={t("periodo.compras")} fill={COLORES_DE_SERIE[1]} radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                <div className={CLASES_TABLA_DESPLAZABLE}>
                                    <table className={CLASES_TABLA}>
                                        <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                            <tr>
                                                <th className="px-4 py-3">{t("periodo.mes")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.udsVendidas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.ventas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.udsCompradas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.compras")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.byMonth.map((m) => (
                                                <tr key={m.month}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-foreground">{mesLargo(m.month)}</td>
                                                    <CeldasDeCifras fila={m} />
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t border-border">
                                            <tr>
                                                <th scope="row" className="px-4 py-3 text-left font-semibold text-foreground">{t("comun.total")}</th>
                                                <CeldasDeCifras fila={totales} fuerte />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </section>

                            <section className="bg-surface rounded-xl border border-border">
                                <div className="px-4 pt-4">
                                    <h2 className="text-base font-semibold text-foreground">{t("periodo.porCategoria")}</h2>
                                    <p className="text-xs text-foreground-muted">{t("periodo.porCategoriaAyuda")}</p>
                                </div>
                                <div className={cn(CLASES_TABLA_DESPLAZABLE, "mt-3")}>
                                    <table className={CLASES_TABLA}>
                                        <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                            <tr>
                                                <th className="px-4 py-3">{t("productos.campo.categoria")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.udsVendidas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.ventas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.udsCompradas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.compras")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.byCategory.map((c) => (
                                                <tr key={c.name ?? ""}>
                                                    <td className={cn("px-4 py-3", c.name ? "text-foreground" : "text-foreground-muted")}>
                                                        {c.name ?? t("productos.sinCategoria")}
                                                    </td>
                                                    <CeldasDeCifras fila={c} />
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="bg-surface rounded-xl border border-border">
                                <div className="px-4 pt-4">
                                    <h2 className="text-base font-semibold text-foreground">{t("periodo.porProducto")}</h2>
                                    {data.moreProducts && (
                                        <p className="text-xs text-foreground-muted">
                                            {t("periodo.productosMostrados", { mostrados: data.byProduct.length })}
                                        </p>
                                    )}
                                </div>
                                <div className={cn(CLASES_TABLA_DESPLAZABLE, "mt-3")}>
                                    <table className={CLASES_TABLA}>
                                        <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                            <tr>
                                                <th className="px-4 py-3">{t("ordenes.producto")}</th>
                                                <th className="px-4 py-3">{t("productos.campo.categoria")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.udsVendidas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.ventas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.udsCompradas")}</th>
                                                <th className="px-4 py-3 text-right">{t("periodo.compras")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.byProduct.map((p) => (
                                                <tr key={p.productId ?? `~${p.name}`}>
                                                    <td className="px-4 py-3 min-w-48">
                                                        <span className="font-medium text-foreground">{p.name}</span>
                                                        {p.sku && <span className="block whitespace-nowrap text-xs text-foreground-muted">{p.sku}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-foreground-muted">{p.category ?? t("productos.sinCategoria")}</td>
                                                    <CeldasDeCifras fila={p} />
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
