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
import { useStockMovements } from "@/modules/products/hooks/useStockMovements";
import { usePriceHistory } from "@/modules/products/hooks/usePriceHistory";
import { downloadBlob, blobCsv } from "@/modules/products/utils/importExport";
import type { StockMovementType } from "@/modules/products/types/product.types";

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateShort(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function exportMovementsCsv(
    productName: string,
    movements: Array<{ createdAt: string; type: string; delta: number; stockAfter: number; note?: string | null }>,
) {
    const header = "Fecha,Tipo,Cambio,Stock resultante,Nota";
    const rows = movements.map((m) =>
        [formatDate(m.createdAt), TIPO_MOVIMIENTO[m.type as StockMovementType]?.label ?? m.type, m.delta, m.stockAfter, m.note ?? ""].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blobCsv(csv), `movimientos-${productName.replace(/\s+/g, "-").toLowerCase()}-${date}.csv`);
}

export default function StockMovementsPage() {
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
            <div className="max-w-4xl mx-auto px-6 py-8">
                <p className="text-danger">No se pudo cargar el historial de movimientos.</p>
                <Link to="/catalog/products" className="text-info text-sm hover:underline mt-2 inline-block">
                    ← Volver a productos
                </Link>
            </div>
        );
    }

    const { product, movements } = data;
    const priceHistory = priceData?.history ?? [];

    const chartData = movements.map((m) => ({
        date: formatDateShort(m.createdAt),
        stock: m.stockAfter,
        type: m.type,
    }));

    const priceChartData = priceHistory.map((h) => ({
        date: formatDateShort(h.createdAt),
        precio: Number(h.newPrice),
    }));

    const isLowStock = product.stock <= (product.minStock ?? 0);

    return (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
            {/* Header */}
            <div>
                <Link
                    to="/catalog/products"
                    className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-info transition-colors mb-4"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Volver a productos
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
                        {product.sku && (
                            <p className="text-xs text-foreground-muted font-mono mt-0.5">{product.sku}</p>
                        )}
                        <p className="text-sm text-foreground-muted mt-1">Historial de movimientos de stock</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-right">
                            <p className={`text-2xl font-bold tabular-nums ${isLowStock ? "text-warning" : "text-foreground"}`}>
                                {product.stock}
                            </p>
                            <p className="text-xs text-foreground-muted">
                                Stock actual {product.minStock > 0 ? `(mín: ${product.minStock})` : ""}
                            </p>
                        </div>
                        <EstadoBadge estado={product.isActive ? ACTIVIDAD.activo : ACTIVIDAD.inactivo} />
                        {movements.length > 0 && (
                            <Button
                                variant="secondary"
                                onClick={() => exportMovementsCsv(product.name, movements)}
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Exportar CSV
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
                        {tab === "movements" ? `Movimientos (${movements.length})` : `Historial de precios (${priceHistory.length})`}
                    </button>
                ))}
            </div>

            {activeTab === "movements" && (
                <>
                    {/* Gráfico de stock */}
                    {movements.length > 0 && (
                        <div className="bg-surface rounded-xl border border-border p-6">
                            <h2 className="text-base font-semibold text-foreground mb-6">Evolución del stock</h2>
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 13 }}
                                        formatter={(value) => [`${Number(value)} unidades`, "Stock"]}
                                    />
                                    {(product.minStock ?? 0) > 0 && (
                                        <ReferenceLine
                                            y={product.minStock}
                                            stroke="#f97316"
                                            strokeDasharray="4 4"
                                            label={{ value: `Mín (${product.minStock})`, position: "right", fontSize: 11 }}
                                        />
                                    )}
                                    <Line
                                        type="stepAfter"
                                        dataKey="stock"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: "#3b82f6" }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Filtros */}
                    {movements.length > 0 && (
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="min-w-36">
                                <Select
                                    options={[
                                        { value: "", label: "Todos los tipos" },
                                        // Las opciones salen del descriptor para que el filtro no
                                        // pueda decir una cosa y la insignia de la tabla otra.
                                        ...Object.entries(TIPO_MOVIMIENTO).map(([value, { label }]) => ({ value, label })),
                                    ]}
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-foreground-muted whitespace-nowrap">Desde</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 md:min-h-9"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-foreground-muted whitespace-nowrap">Hasta</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="min-h-11 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 md:min-h-9"
                                />
                            </div>
                            {(typeFilter || dateFrom || dateTo) && (
                                <Button
                                    variant="secondary"
                                    onClick={() => { setTypeFilter(""); setDateFrom(""); setDateTo(""); }}
                                >
                                    Limpiar filtros
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Tabla de movimientos */}
                    {filteredMovements.length > 0 ? (
                        <div className="bg-surface rounded-xl border border-border overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                                <h2 className="text-base font-semibold text-foreground">
                                    Movimientos ({filteredMovements.length}
                                    {filteredMovements.length !== movements.length && ` de ${movements.length}`})
                                </h2>
                            </div>
                            <div className="overflow-x-auto contain-paint">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                        <tr>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Tipo</th>
                                            <th className="px-6 py-3">Cambio</th>
                                            <th className="px-6 py-3">Stock resultante</th>
                                            <th className="px-6 py-3">Nota</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[...filteredMovements].reverse().map((m) => (
                                            <tr key={m.id} className="hover:bg-surface-muted transition-colors">
                                                <td className="px-6 py-3 text-foreground-muted whitespace-nowrap">
                                                    {formatDate(m.createdAt)}
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
                                ? "Aún no hay movimientos registrados para este producto."
                                : "No hay movimientos que coincidan con los filtros aplicados."}
                        </div>
                    )}
                </>
            )}

            {activeTab === "prices" && (
                <>
                    {priceHistory.length > 0 ? (
                        <>
                            <div className="bg-surface rounded-xl border border-border p-6">
                                <h2 className="text-base font-semibold text-foreground mb-6">Evolución del precio</h2>
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={priceChartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: 13 }}
                                            formatter={(value) => [formatearImporte(Number(value)), "Precio"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="precio"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fill="url(#priceGradient)"
                                            dot={{ r: 4, fill: "#6366f1" }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="bg-surface rounded-xl border border-border overflow-hidden">
                                <div className="px-6 py-4 border-b border-border">
                                    <h2 className="text-base font-semibold text-foreground">Cambios de precio ({priceHistory.length})</h2>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                        <tr>
                                            <th className="px-6 py-3">Fecha</th>
                                            <th className="px-6 py-3">Precio anterior</th>
                                            <th className="px-6 py-3">Precio nuevo</th>
                                            <th className="px-6 py-3">Variación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {[...priceHistory].reverse().map((h) => {
                                            const diff = Number(h.newPrice) - Number(h.oldPrice);
                                            const pct = Number(h.oldPrice) > 0 ? (diff / Number(h.oldPrice)) * 100 : 0;
                                            return (
                                                <tr key={h.id} className="hover:bg-surface-muted">
                                                    <td className="px-6 py-3 text-foreground-muted whitespace-nowrap">
                                                        {formatDate(h.createdAt)}
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
                        </>
                    ) : (
                        <div className="bg-surface rounded-xl border border-border p-6 text-center text-sm text-foreground-muted">
                            Aún no hay cambios de precio registrados para este producto.
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
