import { formatearImporte } from "@/shared/lib/moneda";
import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
    AreaChart, Area,
} from "recharts";
import { Spinner } from "@/shared/components/Spinner";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { TIPO_MOVIMIENTO, ACTIVIDAD } from "@/shared/lib/estados";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";
import { useStockMovements } from "@/modules/products/hooks/useStockMovements";
import { usePriceHistory } from "@/modules/products/hooks/usePriceHistory";
import { downloadBlob, blobCsv } from "@/modules/products/utils/importExport";
import type { StockMovementType } from "@/modules/products/types/product.types";
import { COLOR_DE_REJILLA, ESTILO_DE_TOOLTIP } from "@/shared/lib/grafico";
import { useT } from "@/shared/hooks/useIdioma";
import { IDIOMA_POR_DEFECTO, type Idioma } from "@/shared/i18n/idioma";
import { traducir, type Clave } from "@/shared/i18n/traducir";
import { formatearFecha, IDIOMA_DE_EXPORTACION, LOCALE_DE_GRAFICO } from "@/shared/lib/fechas";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

/** El eje del gráfico va sin año: son puntos de una serie, no fechas que haya que leer. */
function formatDateShort(idioma: Idioma, iso: string) {
    return new Date(iso).toLocaleDateString(LOCALE_DE_GRAFICO[idioma], { day: "2-digit", month: "short" });
}

function exportMovementsCsv(
    productName: string,
    movements: Array<{ createdAt: string; type: string; delta: number; stockAfter: number; note?: string | null }>,
) {
    // T4-04 — **las exportaciones no se traducen: salen siempre en español.** Un CSV no es
    // pantalla, es un formato de intercambio, y sus columnas están emparejadas con las que
    // produce el backend por el test de T3-05. Traducirlas según quién pulse el botón
    // rompería ese emparejamiento y haría que dos exportaciones del mismo dato no se
    // pudieran juntar en la misma hoja de cálculo.
    const header = "Fecha,Tipo,Cambio,Stock resultante,Nota";
    const rows = movements.map((m) =>
        [
            formatearFecha(IDIOMA_DE_EXPORTACION, m.createdAt),
            traducir(IDIOMA_POR_DEFECTO, TIPO_MOVIMIENTO[m.type as StockMovementType]?.clave ?? (m.type as Clave)),
            m.delta,
            m.stockAfter,
            m.note ?? "",
        ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blobCsv(csv), `movimientos-${productName.replace(/\s+/g, "-").toLowerCase()}-${date}.csv`);
}

export default function StockMovementsPage() {
    const { t, tn, idioma } = useT();
    const { id } = useParams<{ id: string }>();
    const { data, isLoading, isError } = useStockMovements(id!);
    const { data: priceData } = usePriceHistory(id!);

    const [typeFilter, setTypeFilter] = useState<string>("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [activeTab, setActiveTab] = useState<"movements" | "prices">("movements");

    const filteredMovements = useMemo(() => {
        if (!data) return [];
        return data.movements.filter((m) => {
            if (typeFilter && m.type !== typeFilter) return false;
            if (dateFrom && new Date(m.createdAt) < new Date(dateFrom)) return false;
            if (dateTo && new Date(m.createdAt) > new Date(dateTo + "T23:59:59")) return false;
            return true;
        });
    }, [data, typeFilter, dateFrom, dateTo]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-32">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
                <p className="text-danger">{t("movimientos.errorCargar")}</p>
                <Link to="/catalog/products" className="text-info text-sm hover:underline mt-2 inline-block">
                    ← {t("movimientos.volverAProductos")}
                </Link>
            </div>
        );
    }

    const { product, movements } = data;
    const priceHistory = priceData?.history ?? [];

    const chartData = movements.map((m) => ({
        date: formatDateShort(idioma, m.createdAt),
        stock: m.stockAfter,
        type: m.type,
    }));

    const priceChartData = priceHistory.map((h) => ({
        date: formatDateShort(idioma, h.createdAt),
        precio: Number(h.newPrice),
    }));

    const isLowStock = product.stock <= (product.minStock ?? 0);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 space-y-8">
            {/* Header */}
            <div>
                <Link
                    to="/catalog/products"
                    className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-info transition-colors mb-4"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    {t("movimientos.volverAProductos")}
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                        {product.sku && (
                            <p className="text-xs text-foreground-muted font-mono mt-0.5">{product.sku}</p>
                        )}
                        <p className="text-sm text-foreground-muted mt-1">{t("movimientos.subtitulo")}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-right">
                            <p className={`text-2xl font-bold tabular-nums ${isLowStock ? "text-warning" : "text-foreground"}`}>
                                {product.stock}
                            </p>
                            <p className="text-xs text-foreground-muted">
                                {t("productos.campo.stockActual")}{" "}
                                {product.minStock > 0 ? t("movimientos.minimo", { minimo: product.minStock }) : ""}
                            </p>
                        </div>
                        <EstadoBadge estado={product.isActive ? ACTIVIDAD.activo : ACTIVIDAD.inactivo} />
                        {movements.length > 0 && (
                            <Button
                                variant="secondary"
                                onClick={() => exportMovementsCsv(product.name, movements)}
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                {t("productos.exportarCsv")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {(["movements", "prices"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`min-h-11 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px md:min-h-9 ${
                            activeTab === tab
                                ? "border-info text-info"
                                : "border-transparent text-foreground-muted hover:text-foreground"
                        }`}
                    >
                        {tab === "movements"
                            ? t("movimientos.pestanaMovimientos", { cantidad: movements.length })
                            : t("movimientos.pestanaPrecios", { cantidad: priceHistory.length })}
                    </button>
                ))}
            </div>

            {activeTab === "movements" && (
                <>
                    {/* Gráfico de stock */}
                    {movements.length > 0 && (
                        <div className="bg-surface rounded-xl border border-border p-6">
                            <h2 className="text-base font-semibold text-foreground mb-6">{t("movimientos.evolucionStock")}</h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ ...ESTILO_DE_TOOLTIP, fontSize: 13 }}
                                        formatter={(value) => [tn("movimientos.unidades", Number(value)), t("productos.campo.stock")]}
                                    />
                                    {(product.minStock ?? 0) > 0 && (
                                        <ReferenceLine
                                            y={product.minStock}
                                            stroke="var(--color-warning)"
                                            strokeDasharray="4 4"
                                            label={{ value: t("movimientos.etiquetaMinimo", { minimo: product.minStock ?? 0 }), position: "right", fontSize: 11 }}
                                        />
                                    )}
                                    <Line
                                        type="stepAfter"
                                        dataKey="stock"
                                        stroke="var(--color-chart-1)"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: "var(--color-chart-1)" }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Filtros */}
                    {movements.length > 0 && (
                        /*
                         * Rejilla, como los filtros de Productos. Con `flex-wrap` y las
                         * etiquetas «Desde»/«Hasta» **al lado** del campo, a 412 px cada
                         * fecha se quedaba en unos 120 px: un `input[type=date]` ahí no
                         * enseña ni el año, y en Chrome de Android el icono del calendario
                         * tapa parte del valor. La etiqueta pasa a ir encima, que es donde
                         * cabe, y cada control ocupa su fila en móvil.
                         */
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                            <div>
                                <Select
                                    options={[
                                        { value: "", label: t("movimientos.todosLosTipos") },
                                        // Las opciones salen del descriptor para que el filtro no
                                        // pueda decir una cosa y la insignia de la tabla otra.
                                        ...Object.entries(TIPO_MOVIMIENTO).map(([value, { clave }]) => ({ value, label: t(clave) })),
                                    ]}
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                />
                            </div>
                            <CampoDeFecha
                                label={t("movimientos.desde")}
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <CampoDeFecha
                                label={t("movimientos.hasta")}
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                            {(typeFilter || dateFrom || dateTo) && (
                                <Button
                                    variant="secondary"
                                    onClick={() => { setTypeFilter(""); setDateFrom(""); setDateTo(""); }}
                                >
                                    {t("movimientos.limpiarFiltros")}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Tabla de movimientos */}
                    {filteredMovements.length > 0 ? (
                        <div className="bg-surface rounded-xl border border-border overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <h2 className="text-base font-semibold text-foreground">
                                    {filteredMovements.length === movements.length
                                        ? t("movimientos.pestanaMovimientos", { cantidad: filteredMovements.length })
                                        : t("movimientos.tablaFiltrada", {
                                            cantidad: filteredMovements.length,
                                            total: movements.length,
                                        })}
                                </h2>
                            </div>
                            <div className={CLASES_TABLA_DESPLAZABLE}>
                                <table className={CLASES_TABLA}>
                                    <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                        <tr>
                                            <th className="px-6 py-3">{t("comun.fecha")}</th>
                                            <th className="px-6 py-3">{t("movimientos.columnaTipo")}</th>
                                            <th className="px-6 py-3">{t("movimientos.columnaCambio")}</th>
                                            <th className="px-6 py-3">{t("movimientos.columnaStockResultante")}</th>
                                            <th className="px-6 py-3">{t("movimientos.columnaNota")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[...filteredMovements].reverse().map((m) => (
                                            <tr key={m.id} className="hover:bg-surface-muted transition-colors">
                                                <td className="px-6 py-3 text-foreground-muted whitespace-nowrap">
                                                    {formatearFecha(idioma, m.createdAt)}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <EstadoBadge estado={TIPO_MOVIMIENTO[m.type as StockMovementType]} />
                                                </td>
                                                <td className="px-6 py-3 font-medium">
                                                    <span className={m.delta >= 0 ? "text-success" : "text-danger"}>
                                                        {m.delta >= 0 ? `+${m.delta}` : m.delta}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-foreground">{m.stockAfter}</td>
                                                <td className="px-6 py-3 text-foreground-muted text-xs">{m.note ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-surface rounded-xl border border-border p-6 text-center text-sm text-foreground-muted">
                            {movements.length === 0
                                ? t("movimientos.sinMovimientos")
                                : t("movimientos.sinCoincidencias")}
                        </div>
                    )}
                </>
            )}

            {activeTab === "prices" && (
                <>
                    {priceHistory.length > 0 ? (
                        <>
                            <div className="bg-surface rounded-xl border border-border p-6">
                                <h2 className="text-base font-semibold text-foreground mb-6">{t("precios.evolucion")}</h2>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={priceChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-chart-5)" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_DE_REJILLA} />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                                        <Tooltip
                                            contentStyle={{ ...ESTILO_DE_TOOLTIP, fontSize: 13 }}
                                            formatter={(value) => [formatearImporte(Number(value)), t("productos.campo.precio")]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="precio"
                                            stroke="var(--color-chart-5)"
                                            strokeWidth={2}
                                            fill="url(#priceGradient)"
                                            dot={{ r: 4, fill: "var(--color-chart-5)" }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                                <div className="px-6 py-4 border-b border-border">
                                    <h2 className="text-base font-semibold text-foreground">{t("precios.cambios", { cantidad: priceHistory.length })}</h2>
                                </div>
                                <div className={CLASES_TABLA_DESPLAZABLE}>
                                <table className={CLASES_TABLA}>
                                    <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                        <tr>
                                            <th className="px-6 py-3">{t("comun.fecha")}</th>
                                            <th className="px-6 py-3">{t("precios.anterior")}</th>
                                            <th className="px-6 py-3">{t("precios.nuevo")}</th>
                                            <th className="px-6 py-3">{t("precios.variacion")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[...priceHistory].reverse().map((h) => {
                                            const diff = Number(h.newPrice) - Number(h.oldPrice);
                                            const pct = Number(h.oldPrice) > 0 ? (diff / Number(h.oldPrice)) * 100 : 0;
                                            return (
                                                <tr key={h.id} className="hover:bg-surface-muted">
                                                    <td className="px-6 py-3 text-foreground-muted whitespace-nowrap">
                                                        {formatearFecha(idioma, h.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-3 text-foreground-muted">
                                                        {formatearImporte(h.oldPrice)}
                                                    </td>
                                                    <td className="px-6 py-3 font-medium text-foreground">
                                                        {formatearImporte(h.newPrice)}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className={diff >= 0 ? "text-danger" : "text-success"}>
                                                            {formatearImporte(diff, { signo: true })} ({pct.toFixed(1)}%)
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-surface rounded-xl border border-border p-6 text-center text-sm text-foreground-muted">
                            {t("precios.sinCambios")}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
