import { Link } from "react-router-dom";
import { ChevronRightIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Barra, ZonaCargando } from "@/shared/components/Esqueleto";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";
import { escribirNumeroDeVenta } from "@/shared/contratos";
import { useT } from "@/shared/hooks/useIdioma";
import { useReintentarFallidas } from "@/shared/hooks/useFalloDeCarga";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { ESTADO_ORDEN_VENTA, buscarEstado } from "@/shared/lib/estados";
import { formatearHora } from "@/shared/lib/fechas";
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
    const { hoy, ventas, cantidad, importe, incompleto, cargando, error, reintentando } = useMisVentasDeHoy(email);
    const reintentar = useReintentarFallidas();

    return (
        // `items-start` (AUD-008, paso 11): la tarjeta del mostrador mide lo suyo. Estirada a la
        // altura de la fila y con el botón abajo, «Ir al mostrador» subía 174 px al llegar las
        // ventas —con el cliente delante, un toque fallido—.
        <div className="grid items-start gap-6 lg:grid-cols-3">
            <section aria-labelledby="mostrador" className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:p-6">
                <div>
                    <h2 id="mostrador" className="text-base font-semibold text-foreground">{t("dashboard.vendedor.titulo")}</h2>
                    <p className="mt-1 text-sm text-foreground-muted">{t("dashboard.vendedor.explicacion")}</p>
                </div>
                {/* `min-h-12` en cualquier ancho: la base del botón baja a 36 px solo con ratón
                    (`md:pointer-fine:`), así que en la tableta del mostrador ya no mide 40. */}
                <Link to="/counter" className={clasesDeBoton("primary", "w-full min-h-12 text-base")}>
                    <ComputerDesktopIcon className="h-5 w-5" aria-hidden="true" />
                    {t("dashboard.vendedor.irAMostrador")}
                </Link>
            </section>

            <section aria-labelledby="mis-ventas" className="rounded-xl border border-border bg-surface p-5 sm:p-6 lg:col-span-2">
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
                    // La forma de la lista de verdad —filas de una línea y dos textos—, no la de
                    // las tarjetas de Ventas, que era tres veces más alta.
                    <ZonaCargando className="mt-3 divide-y divide-border">
                        {[0, 1].map((i) => (
                            <div key={i} className="flex min-h-11 items-center justify-between gap-4 py-2.5">
                                <div className="space-y-1.5">
                                    <Barra className="w-28" />
                                    <Barra className="h-3 w-16" />
                                </div>
                                <Barra className="w-16" />
                            </div>
                        ))}
                    </ZonaCargando>
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
                        {ventas.slice(0, VENTAS_A_LA_VISTA).map((v) => {
                            const numero = escribirNumeroDeVenta(v.number);
                            return (
                                // AUD-008, paso 9 — cada venta se abre en Ventas, desplegada: desde
                                // ahí se reimprime el comprobante. La fila entera es el enlace.
                                <li key={v.id} className="relative flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                                    <div className="min-w-0">
                                        <Link
                                            to={`/sale-orders?numero=${v.number}&venta=${v.id}`}
                                            className="text-sm font-medium text-foreground after:absolute after:inset-0 hover:underline"
                                        >
                                            {t("ventas.numero", { numero })}
                                        </Link>
                                        {/* La hora del ticket, no «hace 1 hora»: es la que el cliente tiene en la mano. */}
                                        <p className="text-xs text-foreground-muted tabular-nums">{formatearHora(idioma, v.createdAt)}</p>
                                    </div>
                                    <span className="flex shrink-0 items-center gap-3">
                                        {/* Lo normal en el mostrador es «enviada»: solo se marca la excepción. */}
                                        {v.status !== "SHIPPED" && <EstadoBadge estado={buscarEstado(ESTADO_ORDEN_VENTA, v.status)} />}
                                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatearImporte(Number(v.total))}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {incompleto && !cargando && !error && (
                    <p className="mt-2 text-xs text-foreground-muted">{t("dashboard.vendedor.incompleto", { cantidad: ventas.length })}</p>
                )}

                {/* AUD-008, paso 9 — a Ventas con el filtro puesto: las suyas y de hoy. */}
                <Link
                    to={`/sale-orders?mias=1&desde=${hoy}&hasta=${hoy}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-0.5 rounded-lg text-sm font-medium text-info hover:underline md:pointer-fine:min-h-9"
                >
                    {t("dashboard.vendedor.verVentas")}
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
            </section>
        </div>
    );
}
