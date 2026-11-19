import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownTrayIcon, ArrowLeftIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/shared/components/Button";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";
import { EsqueletoPagina } from "@/shared/components/Esqueleto";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { ReintentoEnLinea } from "@/shared/components/ReintentoEnLinea";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { conSimboloDeMoneda, formatearImporte } from "@/shared/lib/moneda";
import { formatearDia, formatearHora, LOCALE_DE_GRAFICO } from "@/shared/lib/fechas";
import { COLORES_DE_SERIE, COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP, TEXTO_DE_EJE } from "@/shared/lib/grafico";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_SUELTO } from "@/shared/lib/clasesDeMarco";
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

/**
 * AUD-015 — cuando el periodo sale vacío, los que se ofrecen en su lugar: el mes anterior (el
 * caso típico es «este mes» en sus primeros días) y el año, que casi nunca lo está.
 */
const ALTERNATIVAS_SI_VACIO: PeriodPreset[] = ["last-month", "this-year"];

const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * AUD-015 — el periodo vive en la URL (`?preset=last-month` o `?from=…&to=…`): recargar,
 * volver atrás o pasar el enlace enseña el mismo informe. Lo que no se entiende se ignora y
 * queda el de siempre, este mes.
 */
function consultaDeLaUrl(params: URLSearchParams): ConsultaDePeriodo {
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";
    if (DIA.test(from) && DIA.test(to) && from <= to) return { from, to };
    const preset = params.get("preset");
    return { preset: ATAJOS.includes(preset as PeriodPreset) ? (preset as PeriodPreset) : "this-month" };
}

/**
 * Hoy en la zona del negocio, `YYYY-MM-DD`. AUD-015 — «Este año» llega del servidor hasta el
 * 31 de diciembre (un atajo es el año natural, a propósito), y la pantalla enseñaba los meses que
 * aún no han llegado a cero, y «al 30 nov» siendo 18. Con la zona que trae la respuesta se sabe
 * qué es hoy allí, no en este navegador.
 */
function hoyEn(zona: string): string | null {
    try {
        return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch {
        return null;
    }
}

/** `America/Santo_Domingo` → `America/Santo Domingo`: así puede partirse a 390 px. */
const zonaLegible = (zona: string) => zona.replaceAll("_", " ");

type Cifras = { salesUnits: number; salesRevenue?: number; purchaseUnits: number; purchaseAmount?: number };

/**
 * Las columnas de cifras, iguales en las tres tablas. AUD-015 — sin importes (todo rol que no es
 * ADMIN, como en `GET /reports`), solo las unidades.
 */
function CeldasDeCifras({ fila, conImportes, fuerte = false }: { fila: Cifras; conImportes: boolean; fuerte?: boolean }) {
    const clase = cn("px-4 py-3 text-right tabular-nums", fuerte ? "font-semibold text-foreground" : "text-foreground-muted");
    const unidades = cn(clase, !conImportes && "text-foreground");
    return (
        <>
            <td className={unidades}>{fila.salesUnits}</td>
            {conImportes && <td className={cn(clase, "text-foreground")}>{formatearImporte(fila.salesRevenue ?? 0)}</td>}
            <td className={unidades}>{fila.purchaseUnits}</td>
            {conImportes && <td className={cn(clase, "text-foreground")}>{formatearImporte(fila.purchaseAmount ?? 0)}</td>}
        </>
    );
}

function CabecerasDeCifras({ conImportes }: { conImportes: boolean }) {
    const { t } = useT();
    return (
        <>
            <th scope="col" className="px-4 py-3 text-right">{t("periodo.udsVendidas")}</th>
            {conImportes && <th scope="col" className="px-4 py-3 text-right">{t("periodo.ventas")}</th>}
            <th scope="col" className="px-4 py-3 text-right">{t("periodo.udsCompradas")}</th>
            {conImportes && <th scope="col" className="px-4 py-3 text-right">{t("periodo.compras")}</th>}
        </>
    );
}

const CLASES_CABECERA = "whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted";

/**
 * T5-09 — ventas enviadas y compras recibidas de un periodo.
 *
 * El periodo se pide como atajo o como rango, y la respuesta trae las fechas ya resueltas por
 * el backend **en la zona del negocio**: «este mes» lo decide el servidor, no el reloj de este
 * navegador. Por eso la pantalla enseña el rango que llegó, no el que calcula ella.
 *
 * AUD-015, crítica de cierre — **nunca cifras de un periodo distinto del que se ve pedido.** Con
 * `keepPreviousData`, al cambiar de periodo se siguen viendo las del anterior hasta que llegan
 * las nuevas; antes no se decía, los campos de fecha se quedaban con lo último escrito y exportar
 * sacaba el periodo de antes. Ahora, mientras llegan, lo de antes se atenúa (`aria-busy`), el
 * subtítulo dice que carga y exportar espera; si falla, se dice y se reintenta.
 */
export default function InformePorPeriodoPage() {
    const { t, idioma } = useT();
    const [params, setParams] = useSearchParams();
    const consulta = consultaDeLaUrl(params);
    const setConsulta = (nueva: ConsultaDePeriodo) =>
        // `replace`: cambiar de periodo no llena el historial; «Atrás» sigue llevando a Reportes.
        setParams("preset" in nueva ? { preset: nueva.preset } : { from: nueva.from, to: nueva.to }, { replace: true });

    const { data, isError, error, refetch, isFetching, isPlaceholderData, dataUpdatedAt } = usePeriodReport(consulta);
    const atajoActivo = "preset" in consulta ? consulta.preset : null;
    // Lo que se ve no es lo pedido: son las cifras del periodo anterior mientras llegan las nuevas.
    const desfasado = isPlaceholderData;

    /**
     * Los campos de fecha dicen el rango que se está viendo, salvo mientras se escribe uno
     * (`edicion`). Antes eran un estado propio que no se enteraba de los atajos: tras «Este año»
     * seguían diciendo enero de 2025 debajo de las cifras de 2026.
     */
    const [edicion, setEdicion] = useState<{ desde: string; hasta: string } | null>(null);
    const rangoVisible = "from" in consulta ? consulta : data && !desfasado ? { from: data.from, to: data.to } : null;
    const desde = edicion?.desde ?? rangoVisible?.from ?? "";
    const hasta = edicion?.hasta ?? rangoVisible?.to ?? "";
    const [errorDeRango, setErrorDeRango] = useState<string>();
    // En el móvil, las fechas a mano van plegadas: ocupaban toda la primera pantalla y la primera
    // cifra empezaba a 760 px. Un rango pedido a mano las deja abiertas.
    const [fechasAbiertas, setFechasAbiertas] = useState(false);
    const fechasVisibles = fechasAbiertas || "from" in consulta;

    const aplicarRango = (e: FormEvent) => {
        e.preventDefault();
        if (!desde || !hasta) return setErrorDeRango(t("periodo.faltanFechas"));
        if (desde > hasta) return setErrorDeRango(t("periodo.rangoInvalido"));
        setErrorDeRango(undefined);
        setEdicion(null);
        setConsulta({ from: desde, to: hasta });
    };

    const elegirAtajo = (atajo: PeriodPreset) => {
        setErrorDeRango(undefined);
        setEdicion(null);
        setConsulta({ preset: atajo });
    };

    const mesCorto = (mes: string) => {
        const [y, m] = mes.split("-").map(Number);
        return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], { month: "short", timeZone: "UTC" });
    };
    const mesLargo = (mes: string) => {
        const [y, m] = mes.split("-").map(Number);
        const texto = new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], { month: "long", year: "numeric", timeZone: "UTC" });
        // Solo la primera letra: la clase `capitalize` sube todas y dejaba «Enero De 2026».
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    };

    const totales = data?.totals;
    const conImportes = totales?.salesRevenue !== undefined;
    const vacio = totales !== undefined && totales.salesUnits === 0 && totales.purchaseUnits === 0;
    const alternativas = ALTERNATIVAS_SI_VACIO.filter((a) => a !== atajoActivo);

    // Hasta hoy, no hasta el final del atajo: un mes que no ha llegado no es un mes a cero.
    const hoy = data ? hoyEn(data.timezone) : null;
    const hastaHoy = data && hoy !== null && data.to > hoy && data.from <= hoy;
    const mesDeHoy = hoy?.slice(0, 7);
    const meses = data ? data.byMonth.filter((m) => mesDeHoy === undefined || !(m.month > mesDeHoy)) : [];
    const mesesAMostrar = meses.length > 0 ? meses : (data?.byMonth ?? []);

    // AUD-015 — un archivo de ceros no le sirve a nadie, y mientras llega el periodo pedido lo que
    // se exportaría sería el anterior. Desactivado, el botón dice por qué (`aria-describedby`).
    const motivoSinExportar = !data || desfasado ? "periodo.sinExportar.cargando" : vacio ? "periodo.sinExportar.vacio" : null;

    const rangoTexto = data
        ? t(hastaHoy ? "periodo.rangoHastaHoy" : "periodo.rango", {
              desde: formatearDia(idioma, data.from),
              hasta: formatearDia(idioma, hastaHoy && hoy ? hoy : data.to),
              zona: zonaLegible(data.timezone),
          })
        : t("periodo.subtitulo");

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <Link to="/reports" className={cn(CLASES_ENLACE_SUELTO, "gap-1 text-sm text-info hover:underline")}>
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                {t("periodo.volver")}
            </Link>

            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.informePeriodo")}</h1>
                    {/* Región viva: cambiar de periodo se anuncia —primero que carga, después el
                        rango que llegó—. Nace con texto, así que al abrir no se lee dos veces. */}
                    <p role="status" className="text-sm text-foreground-muted mt-1">
                        {desfasado ? t("periodo.cargando") : rangoTexto}
                    </p>
                    {data && isError && !desfasado && (
                        <p className="mt-1 text-sm text-warning">
                            {t("dashboard.noActualizado", { hora: formatearHora(idioma, dataUpdatedAt) })}{" "}
                            <ReintentoEnLinea onReintentar={() => void refetch()} reintentando={isFetching} />
                        </p>
                    )}
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    <Button
                        variant="secondary"
                        disabled={motivoSinExportar !== null}
                        aria-describedby={motivoSinExportar ? "periodo-sin-exportar" : undefined}
                        onClick={() => data && downloadPeriodReport(data, "csv")}
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                        {t("periodo.exportarCsv")}
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={motivoSinExportar !== null}
                        aria-describedby={motivoSinExportar ? "periodo-sin-exportar" : undefined}
                        onClick={() => data && downloadPeriodReport(data, "pdf")}
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                        {t("reportes.descargarPdf")}
                    </Button>
                    {motivoSinExportar && <p id="periodo-sin-exportar" className="sr-only">{t(motivoSinExportar)}</p>}
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
                    {!fechasVisibles && (
                        <Button
                            variant="ghost"
                            className="sm:hidden"
                            aria-expanded={false}
                            aria-controls="periodo-fechas"
                            onClick={() => setFechasAbiertas(true)}
                        >
                            <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                            {t("periodo.otrasFechas")}
                        </Button>
                    )}
                </div>
                <form
                    id="periodo-fechas"
                    onSubmit={aplicarRango}
                    noValidate
                    className={cn("flex-col gap-3 sm:flex sm:flex-row sm:items-end", fechasVisibles ? "flex" : "hidden")}
                >
                    <CampoDeFecha
                        label={t("periodo.desde")}
                        value={desde}
                        onChange={(e) => setEdicion({ desde: e.target.value, hasta })}
                    />
                    <CampoDeFecha
                        label={t("periodo.hasta")}
                        value={hasta}
                        onChange={(e) => setEdicion({ desde, hasta: e.target.value })}
                        error={errorDeRango}
                    />
                    <Button type="submit" variant={atajoActivo === null ? "primary" : "secondary"}>
                        {t("periodo.aplicar")}
                    </Button>
                </form>
                <p className={cn("text-xs text-foreground-muted sm:block", fechasVisibles ? "block" : "hidden")}>{t("periodo.alcance")}</p>
            </div>

            {!data || !totales ? (
                // Sin nada que enseñar, un fallo no es una carga eterna: se dice y se reintenta.
                isError ? (
                    <ErrorDeCarga
                        titulo={t("periodo.errorDeCarga")}
                        error={error}
                        onReintentar={() => void refetch()}
                        reintentando={isFetching}
                        className="rounded-xl border border-border bg-surface p-5"
                    />
                ) : (
                    <EsqueletoPagina dentro cifras={6} />
                )
            ) : (
                <div aria-busy={desfasado || undefined} className={cn("space-y-6 transition-opacity", desfasado && "opacity-50")}>
                    {vacio ? (
                        // AUD-015 — vacío, con adónde ir. Sin las seis tarjetas a cero encima: el
                        // mensaje ya dice que no hubo nada.
                        <div role="status" className="rounded-xl border border-border bg-surface py-12 text-center text-sm text-foreground-muted space-y-3">
                            <p>{t("periodo.vacio")}</p>
                            {alternativas.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <span>{t("periodo.vacio.probar")}</span>
                                    {alternativas.map((atajo) => (
                                        <Button key={atajo} variant="secondary" onClick={() => elegirAtajo(atajo)}>
                                            {t(ROTULO_DE_ATAJO[atajo])}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {[
                                    ...(conImportes ? [{ label: t("periodo.ventas"), value: formatearImporte(totales.salesRevenue ?? 0, { decimales: 0 }) }] : []),
                                    { label: t("periodo.unidadesVendidas"), value: totales.salesUnits },
                                    { label: t("periodo.ordenesEnviadas"), value: totales.salesOrders },
                                    ...(conImportes ? [{ label: t("periodo.compras"), value: formatearImporte(totales.purchaseAmount ?? 0, { decimales: 0 }) }] : []),
                                    { label: t("periodo.unidadesCompradas"), value: totales.purchaseUnits },
                                    { label: t("periodo.ordenesRecibidas"), value: totales.purchaseOrders },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                                        <p className="text-base sm:text-xl font-bold text-foreground tabular-nums">{value}</p>
                                        <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                                    </div>
                                ))}
                            </div>

                            <section aria-labelledby="periodo-por-mes" className="bg-surface rounded-xl border border-border">
                                <h2 id="periodo-por-mes" className="px-4 pt-4 text-base font-semibold text-foreground">{t("periodo.porMes")}</h2>
                                {/* El gráfico solo cuando hay con qué comparar: con un mes son dos barras
                                    solas. AUD-015 — **uno por serie, cada uno con su escala**: en un
                                    mismo eje, las ventas (unos 20 k) quedaban como astillas al lado de
                                    las compras (500 k). Sin importes, en unidades. La tabla de debajo
                                    es la alternativa para el lector: los dos van `aria-hidden`. */}
                                {mesesAMostrar.length > 1 && (
                                    <div className="grid grid-cols-1 gap-4 px-2 pt-4 md:grid-cols-2" aria-hidden="true">
                                        {[
                                            { titulo: conImportes ? t("periodo.ventas") : t("periodo.udsVendidas"), clave: conImportes ? "salesRevenue" : "salesUnits", color: COLORES_DE_SERIE[0] },
                                            { titulo: conImportes ? t("periodo.compras") : t("periodo.udsCompradas"), clave: conImportes ? "purchaseAmount" : "purchaseUnits", color: COLORES_DE_SERIE[1] },
                                        ].map(({ titulo, clave, color }) => (
                                            <div key={clave}>
                                                <p className="px-2 text-xs font-medium text-foreground-muted">{titulo}</p>
                                                <div className="h-48">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={mesesAMostrar.map((m) => ({ mes: mesCorto(m.month), valor: Number(m[clave as keyof typeof m] ?? 0) }))}
                                                            margin={{ left: 0, right: 8, top: 8 }}
                                                            accessibilityLayer={false}
                                                        >
                                                            <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} vertical={false} />
                                                            <XAxis dataKey="mes" tick={TEXTO_DE_EJE} interval={0} />
                                                            <YAxis
                                                                tick={TEXTO_DE_EJE}
                                                                width={48}
                                                                allowDecimals={false}
                                                                tickFormatter={(v: number) => (conImportes ? conSimboloDeMoneda(v >= 1000 ? `${Math.round(v / 1000)}k` : v) : String(v))}
                                                            />
                                                            <Tooltip
                                                                contentStyle={ESTILO_DE_TOOLTIP}
                                                                cursor={{ fill: "var(--color-surface-muted)" }}
                                                                formatter={(v) => [conImportes ? formatearImporte(Number(v)) : Number(v), titulo]}
                                                            />
                                                            <Bar dataKey="valor" fill={color} radius={[4, 4, 0, 0]} name={titulo} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className={CLASES_TABLA_DESPLAZABLE}>
                                    <table className={CLASES_TABLA} aria-labelledby="periodo-por-mes">
                                        <thead className={CLASES_CABECERA}>
                                            <tr>
                                                <th scope="col" className="px-4 py-3">{t("periodo.mes")}</th>
                                                <CabecerasDeCifras conImportes={conImportes} />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {mesesAMostrar.map((m) => (
                                                <tr key={m.month}>
                                                    <td className="px-4 py-3 whitespace-nowrap text-foreground">{mesLargo(m.month)}</td>
                                                    <CeldasDeCifras fila={m} conImportes={conImportes} />
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t border-border">
                                            <tr>
                                                <th scope="row" className="px-4 py-3 text-left font-semibold text-foreground">{t("comun.total")}</th>
                                                <CeldasDeCifras fila={totales} conImportes={conImportes} fuerte />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </section>

                            <section aria-labelledby="periodo-por-categoria" className="bg-surface rounded-xl border border-border">
                                <div className="px-4 pt-4">
                                    <h2 id="periodo-por-categoria" className="text-base font-semibold text-foreground">{t("periodo.porCategoria")}</h2>
                                    <p className="text-xs text-foreground-muted">{t("periodo.porCategoriaAyuda")}</p>
                                </div>
                                <div className={cn(CLASES_TABLA_DESPLAZABLE, "mt-3")}>
                                    <table className={CLASES_TABLA} aria-labelledby="periodo-por-categoria">
                                        <thead className={CLASES_CABECERA}>
                                            <tr>
                                                <th scope="col" className="px-4 py-3">{t("productos.campo.categoria")}</th>
                                                <CabecerasDeCifras conImportes={conImportes} />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.byCategory.map((c) => (
                                                <tr key={c.name ?? ""}>
                                                    <td className={cn("px-4 py-3", c.name ? "text-foreground" : "text-foreground-muted")}>
                                                        {c.name ?? t("productos.sinCategoria")}
                                                    </td>
                                                    <CeldasDeCifras fila={c} conImportes={conImportes} />
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section aria-labelledby="periodo-por-producto" className="bg-surface rounded-xl border border-border">
                                <div className="px-4 pt-4">
                                    <h2 id="periodo-por-producto" className="text-base font-semibold text-foreground">{t("periodo.porProducto")}</h2>
                                    {data.moreProducts && (
                                        <p className="text-xs text-foreground-muted">
                                            {t("periodo.productosMostrados", { mostrados: data.byProduct.length })}
                                        </p>
                                    )}
                                </div>
                                <div className={cn(CLASES_TABLA_DESPLAZABLE, "mt-3")}>
                                    <table className={CLASES_TABLA} aria-labelledby="periodo-por-producto">
                                        <thead className={CLASES_CABECERA}>
                                            <tr>
                                                <th scope="col" className="px-4 py-3">{t("ordenes.producto")}</th>
                                                <th scope="col" className="px-4 py-3">{t("productos.campo.categoria")}</th>
                                                <CabecerasDeCifras conImportes={conImportes} />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {data.byProduct.map((p) => (
                                                <tr key={p.productId ?? `~${p.name}`}>
                                                    <td className="px-4 py-3 min-w-48">
                                                        {/* Como en Reportes: el nombre lleva a sus movimientos. Un
                                                            producto borrado no tiene adónde ir y queda en texto. */}
                                                        {p.productId ? (
                                                            <Link
                                                                to={`/catalog/products/${p.productId}/movements`}
                                                                className={cn(CLASES_ENLACE_SUELTO, "font-medium text-foreground hover:text-info hover:underline")}
                                                            >
                                                                {p.name}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-medium text-foreground">{p.name}</span>
                                                        )}
                                                        {p.sku && <span className="block whitespace-nowrap text-xs text-foreground-muted">{p.sku}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-foreground-muted">{p.category ?? t("productos.sinCategoria")}</td>
                                                    <CeldasDeCifras fila={p} conImportes={conImportes} />
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
