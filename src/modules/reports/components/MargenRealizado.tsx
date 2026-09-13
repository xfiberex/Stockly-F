import { Link } from "react-router-dom";
import { formatearImporte } from "@/shared/lib/moneda";
import { useT } from "@/shared/hooks/useIdioma";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { cn } from "@/shared/lib/cn";
import type { ProfitMargin } from "@/modules/reports/types/reports.types";

/** Sin ventas no hay porcentaje: se dice «—», porque un 0 % diría que se vendió sin ganar. */
function porcentaje(valor: number | null) {
    return valor === null ? "—" : `${valor.toFixed(1)} %`;
}

/**
 * El margen negativo va en rojo **y con su signo**: el color solo no le llega a quien no lo
 * distingue (T2-38), pero un «−$2.00» se lee igual en escala de grises.
 */
function claseDeMargen(margen: number) {
    return margen < 0 ? "text-danger" : "text-foreground";
}

interface FilaDeMargen {
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number | null;
}

function CeldasDeMargen({ fila, destacada = false }: { fila: FilaDeMargen; destacada?: boolean }) {
    return (
        <>
            <td className={cn("px-6 py-3 text-right tabular-nums", destacada ? "font-semibold text-foreground" : "text-foreground-muted")}>
                {formatearImporte(fila.revenue)}
            </td>
            <td className={cn("px-6 py-3 text-right tabular-nums", destacada ? "font-semibold text-foreground" : "text-foreground-muted")}>
                {formatearImporte(fila.cost)}
            </td>
            <td className={cn("px-6 py-3 text-right font-semibold tabular-nums", claseDeMargen(fila.margin))}>
                {formatearImporte(fila.margin)}
            </td>
            <td className={cn("px-6 py-3 text-right tabular-nums", fila.margin < 0 ? "text-danger" : "text-foreground-muted")}>
                {porcentaje(fila.marginPercent)}
            </td>
        </>
    );
}

/**
 * T5-02 — margen realizado de las ventas enviadas en la ventana del informe.
 *
 * Lo que **no** entra en el cálculo se dice en la propia sección: sumar como coste cero lo
 * vendido sin coste daría un margen del 100 % sobre esas ventas y el total parecería mejor de
 * lo que es. Sin esa línea, un margen que cuenta la mitad de las ventas se leería como el
 * margen del negocio.
 */
export function MargenRealizado({ margen }: { margen: ProfitMargin }) {
    const { t } = useT();
    const hayVentas = margen.byCategory.length > 0;

    return (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">{t("reportes.margen.titulo", { dias: margen.days })}</h2>
                <p className="text-xs text-foreground-muted mt-0.5">{t("reportes.margen.ayuda")}</p>
                {margen.revenueWithoutCost > 0 && (
                    <p className="text-xs text-warning mt-1">
                        {t("reportes.margen.fueraDelCalculo", { importe: formatearImporte(margen.revenueWithoutCost) })}
                    </p>
                )}
            </div>

            {!hayVentas ? (
                <p className="px-6 py-8 text-center text-sm text-foreground-muted">{t("reportes.margen.sinVentas", { dias: margen.days })}</p>
            ) : (
                <>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
                            <caption className="sr-only">{t("reportes.margen.porCategoria")}</caption>
                            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                <tr>
                                    <th className="px-6 py-3">{t("productos.campo.categoria")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.ventas")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.coste")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.margen")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.porcentaje")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {margen.byCategory.map((c) => (
                                    <tr key={c.name ?? "sin-categoria"} className="hover:bg-surface-muted">
                                        <td className={cn("px-6 py-3", c.name ? "text-foreground" : "text-foreground-muted")}>
                                            {c.name ?? t("productos.sinCategoria")}
                                        </td>
                                        <CeldasDeMargen fila={c} />
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t border-border">
                                <tr>
                                    <td className="px-6 py-3 font-semibold text-foreground">{t("comun.total")}</td>
                                    <CeldasDeMargen fila={margen} destacada />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-y border-border">
                        <h3 className="text-sm font-semibold text-foreground">{t("reportes.margen.topProductos")}</h3>
                    </div>
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
                            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                <tr>
                                    <th className="px-6 py-3">{t("ordenes.producto")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.unidades")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.ventas")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.coste")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.margen")}</th>
                                    <th className="px-6 py-3 text-right">{t("reportes.margen.porcentaje")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {margen.topProducts.map((p) => (
                                    <tr key={p.productId ?? `borrado-${p.name}`} className="hover:bg-surface-muted">
                                        <td className="px-6 py-3">
                                            {/* Un producto borrado después sigue saliendo, con el nombre que
                                                tenía al venderse, pero ya no hay página a la que llevar. */}
                                            {p.productId ? (
                                                <Link to={`/catalog/products/${p.productId}/movements`} className="font-medium text-foreground hover:text-info">
                                                    {p.name}
                                                </Link>
                                            ) : (
                                                <span className="font-medium text-foreground-muted">{p.name}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right text-foreground-muted tabular-nums">{p.units}</td>
                                        <CeldasDeMargen fila={p} />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
