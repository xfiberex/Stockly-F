import { Link } from "react-router-dom";
import { ChevronRightIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { EsqueletoLista } from "@/shared/components/Esqueleto";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { escribirNumeroDeVenta } from "@/shared/contratos";
import { useT } from "@/shared/hooks/useIdioma";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { ESTADO_ORDEN_VENTA, buscarEstado } from "@/shared/lib/estados";
import { haceCuanto } from "@/shared/lib/fechas";
import { formatearImporte } from "@/shared/lib/moneda";
import { useMisVentasDeHoy } from "../hooks/useMisVentasDeHoy";

/** Las últimas que caben a la vista; el resto está en Ventas. */
const VENTAS_A_LA_VISTA = 8;

/**
 * T6-08 — el panel de SELLER. Quien atiende el mostrador no decide compras ni mira el valor del
 * inventario: su trabajo es vender, y lo único del día que le pertenece son sus ventas. Por eso
 * este panel no pide `/reports` —ni sus importes de negocio— y lleva al mostrador en un clic.
 */
export function PanelDeVendedor({ email }: { email: string | undefined }) {
    const { t, tn, idioma } = useT();
    const { ventas, cantidad, importe, cargando, error, reintentar, reintentando } = useMisVentasDeHoy(email);

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <section
                aria-labelledby="mostrador"
                className="flex flex-col justify-between gap-6 rounded-xl border border-border bg-surface p-5 shadow-raised sm:p-6"
            >
                <div>
                    <h2 id="mostrador" className="text-base font-semibold text-foreground">{t("dashboard.vendedor.titulo")}</h2>
                    <p className="mt-1 text-sm text-foreground-muted">{t("dashboard.vendedor.explicacion")}</p>
                </div>
                <Link to="/counter" className={clasesDeBoton("primary", "w-full min-h-12 text-base")}>
                    <ComputerDesktopIcon className="h-5 w-5" aria-hidden="true" />
                    {t("dashboard.vendedor.irAMostrador")}
                </Link>
            </section>

            <section aria-labelledby="mis-ventas" className="rounded-xl border border-border bg-surface p-5 shadow-raised sm:p-6 lg:col-span-2">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 id="mis-ventas" className="text-base font-semibold text-foreground">{t("dashboard.vendedor.misVentas")}</h2>
                    {/* A cero lo dice el texto de abajo; «0 ventas · $0.00» al lado solo lo repetiría. */}
                    {!cargando && !error && ventas.length > 0 && (
                        <p className="text-sm font-medium text-foreground tabular-nums">
                            {tn("dashboard.vendedor.resumen", cantidad, { importe: formatearImporte(importe) })}
                        </p>
                    )}
                </div>

                {cargando ? (
                    <EsqueletoLista filas={3} className="mt-4" />
                ) : error ? (
                    <ErrorDeCarga
                        className="mt-4"
                        titulo={t("dashboard.vendedor.error")}
                        error={error}
                        onReintentar={reintentar}
                        reintentando={reintentando}
                    />
                ) : ventas.length === 0 ? (
                    <p className="mt-4 text-sm text-foreground-muted">{t("dashboard.vendedor.vacio")}</p>
                ) : (
                    <ul className="mt-3 divide-y divide-border">
                        {ventas.slice(0, VENTAS_A_LA_VISTA).map((v) => (
                            <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                        {t("ventas.numero", { numero: escribirNumeroDeVenta(v.number) })}
                                    </p>
                                    <p className="text-xs text-foreground-muted">{haceCuanto(idioma, v.createdAt)}</p>
                                </div>
                                <span className="flex shrink-0 items-center gap-3">
                                    {/* Lo normal en el mostrador es «enviada»: solo se marca la excepción. */}
                                    {v.status !== "SHIPPED" && <EstadoBadge estado={buscarEstado(ESTADO_ORDEN_VENTA, v.status)} />}
                                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatearImporte(Number(v.total))}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                <Link
                    to="/sale-orders"
                    className="mt-3 inline-flex min-h-11 items-center gap-0.5 rounded-lg text-sm font-medium text-info hover:underline md:min-h-9"
                >
                    {t("dashboard.vendedor.verVentas")}
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
            </section>
        </div>
    );
}
