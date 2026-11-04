import { Link } from "react-router-dom";
import {
    CheckCircleIcon,
    ChevronRightIcon,
    ClockIcon,
    ClipboardDocumentCheckIcon,
    CubeIcon,
    InboxArrowDownIcon,
    TruckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { ReportSummary } from "@/modules/reports/types/reports.types";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Barra } from "@/shared/components/Esqueleto";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { cn } from "@/shared/lib/cn";
import { NIVEL_STOCK, nivelDeStock } from "@/shared/lib/estados";
import { useAtencionDeHoy, type FilaDeAtencion, type Recuento } from "../hooks/useAtencionDeHoy";

/** Cuántos productos de la lista de stock bajo caben en el panel antes de mandar al informe. */
const PRODUCTOS_A_LA_VISTA = 5;

/**
 * Enlace de acción de una fila: texto con el color de enlace de la aplicación, pero con la
 * altura del mínimo táctil en móvil (§4 del sistema de diseño) aunque la marca sea pequeña.
 */
const CLASES_DE_ACCION =
    "inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg text-sm font-medium text-info hover:underline md:min-h-9";

interface Fila {
    clave: FilaDeAtencion;
    etiqueta: Clave;
    detalle?: string;
    recuento: Recuento;
    Icon: React.ElementType;
    /** `peligro`: algo ya está mal (lotes caducados); `aviso`: hay que hacer algo. */
    gravedad: "aviso" | "peligro";
    accion: { texto: Clave; to: string };
}

/**
 * Lo primero del panel: qué hay que hacer hoy. Las filas son las del rol (`filas`) y se
 * pintan siempre, también a cero: así el bloque mide lo mismo mientras cargan sus cifras y no
 * empuja lo que viene debajo. Una fila a cero se atenúa y pierde su acción; una con algo
 * pendiente lleva el color de su estado y su enlace.
 */
export function AtencionDeHoy({
    filas: visibles,
    stock,
    lowStockProducts,
}: {
    filas: readonly FilaDeAtencion[];
    /** Sale de `/reports`, que pide el panel: si falla, la fila dice «no disponible» y el resto sigue. */
    stock: Recuento;
    lowStockProducts: ReportSummary["lowStockProducts"];
}) {
    const { t, tn } = useT();
    const { user } = useAuth();
    const { caducidades, diasDeCaducidad, unidadesCaducadas, conteos, compras, ventas } = useAtencionDeHoy(visibles);

    const todas: Fila[] = [
        {
            clave: "stock",
            etiqueta: "dashboard.atencion.stock",
            recuento: stock,
            Icon: CubeIcon,
            gravedad: lowStockProducts.some((p) => p.stock === 0) ? "peligro" : "aviso",
            // La reposición sugerida es de ADMIN (`routes/index.tsx`); el resto ve el informe.
            accion:
                user?.role === "ADMIN"
                    ? { texto: "dashboard.atencion.reponer", to: "/purchase-orders/suggestions" }
                    : { texto: "dashboard.atencion.verInforme", to: "/reports" },
        },
        {
            clave: "caducidades",
            etiqueta: "dashboard.atencion.caducidades",
            detalle:
                diasDeCaducidad === undefined
                    ? undefined
                    : unidadesCaducadas > 0
                      ? tn("dashboard.atencion.caducadas", unidadesCaducadas)
                      : t("dashboard.atencion.plazo", { dias: diasDeCaducidad }),
            recuento: caducidades,
            Icon: ClockIcon,
            gravedad: unidadesCaducadas > 0 ? "peligro" : "aviso",
            accion: { texto: "dashboard.atencion.verCaducidades", to: "/expiry" },
        },
        {
            clave: "conteos",
            etiqueta: "dashboard.atencion.conteos",
            recuento: conteos,
            Icon: ClipboardDocumentCheckIcon,
            gravedad: "aviso",
            accion: { texto: "dashboard.atencion.verConteos", to: "/inventory-counts" },
        },
        {
            clave: "compras",
            etiqueta: "dashboard.atencion.compras",
            recuento: compras,
            Icon: InboxArrowDownIcon,
            gravedad: "aviso",
            accion: { texto: "dashboard.atencion.verCompras", to: "/purchase-orders" },
        },
        {
            clave: "ventas",
            etiqueta: "dashboard.atencion.ventas",
            recuento: ventas,
            Icon: TruckIcon,
            gravedad: "aviso",
            accion: { texto: "dashboard.atencion.verVentas", to: "/sale-orders" },
        },
    ];
    // El orden es el de `todas`, no el de quien llama: el mismo dato cae siempre en el mismo sitio.
    const filas = todas.filter((f) => visibles.includes(f.clave));

    const todoCargado = filas.every((f) => !f.recuento.cargando);
    const alDia = todoCargado && filas.every((f) => f.recuento.valor === 0);
    const conReposicion = visibles.includes("stock") && lowStockProducts.length > 0;

    return (
        // Sin `shadow-raised` (AUD-008, paso 5): era la única tarjeta del panel con sombra. Lo
        // primero ya lo marca su sitio, arriba, y en el sistema la jerarquía la da el borde.
        <section aria-labelledby="atencion-de-hoy" className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="atencion-de-hoy" className="text-base font-semibold text-foreground">
                    {t("dashboard.atencion.titulo")}
                </h2>
                {alDia && <p className="text-sm text-foreground-muted">{t("dashboard.atencion.alDia")}</p>}
            </div>

            <div className={cn("mt-4 grid gap-x-10 gap-y-6", conReposicion && "lg:grid-cols-2")}>
                <ul className="divide-y divide-border">
                    {filas.map((fila) => (
                        <FilaDeAtencion key={fila.clave} fila={fila} />
                    ))}
                </ul>

                {conReposicion && (
                    <div className="min-w-0 border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
                        <h3 className="text-sm font-semibold text-foreground">{t("dashboard.atencion.reponerPrimero")}</h3>
                        <ul className="mt-2 divide-y divide-border">
                            {lowStockProducts.slice(0, PRODUCTOS_A_LA_VISTA).map((p) => (
                                // El enlace se estira sobre la fila: el blanco táctil es la fila entera,
                                // no la línea del nombre.
                                <li key={p.id} className="relative flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                                    <Link
                                        to={`/catalog/products/${p.id}/movements`}
                                        className="min-w-0 max-w-full truncate text-sm font-medium text-foreground after:absolute after:inset-0 hover:underline"
                                    >
                                        {p.name}
                                    </Link>
                                    <span className="flex shrink-0 items-center gap-2 text-sm">
                                        <span className="tabular-nums text-foreground-muted">
                                            {t("dashboard.unidadesMinimo", { stock: p.stock, minimo: p.minStock })}
                                        </span>
                                        <EstadoBadge estado={NIVEL_STOCK[nivelDeStock(p.stock, p.minStock)]} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {(stock.valor ?? 0) > PRODUCTOS_A_LA_VISTA && (
                            <Link to="/reports" className={CLASES_DE_ACCION}>
                                {t("dashboard.atencion.verMas", { cantidad: (stock.valor ?? 0) - PRODUCTOS_A_LA_VISTA })}
                                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}

function FilaDeAtencion({ fila }: { fila: Fila }) {
    const { t } = useT();
    const { valor, cargando, error } = fila.recuento;
    const pendiente = valor !== null && valor > 0;
    const color = !pendiente ? "text-foreground-muted" : fila.gravedad === "peligro" ? "text-danger" : "text-warning";
    const Icon = valor === 0 ? CheckCircleIcon : fila.Icon;

    return (
        // La cifra va delante y en un ancho fijo: las cuatro quedan en columna y la fila se lee
        // como una frase («4 · Productos con stock bajo»). La acción va al final y, si en móvil
        // no cabe, baja bajo la etiqueta en vez de estrecharla.
        <li className="relative flex min-h-11 items-center gap-3 py-2 first:pt-0 last:pb-0">
            <Icon className={cn("h-5 w-5 shrink-0", color)} aria-hidden="true" />
            <span className={cn("w-8 shrink-0 text-right text-xl font-semibold tabular-nums", color)}>
                {cargando ? (
                    <Barra className="ml-auto w-6" />
                ) : error ? (
                    <span title={t("dashboard.atencion.noDisponible")}>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">{t("dashboard.atencion.noDisponible")}</span>
                    </span>
                ) : (
                    valor
                )}
            </span>
            <div className="min-w-0 flex-1">
                <p className={cn("text-sm", pendiente ? "font-medium text-foreground" : "text-foreground-muted")}>
                    {t(fila.etiqueta)}
                </p>
                {fila.detalle && pendiente && <p className={cn("text-xs", color)}>{fila.detalle}</p>}
            </div>
            {/* En móvil la fila entera es el enlace y solo se ve la flecha: el texto de la
                acción, en otra línea, hacía cada fila el doble de alta. El texto sigue ahí para
                el lector de pantalla, y desde `sm` vuelve a verse. */}
            {pendiente && (
                <Link to={fila.accion.to} className={cn(CLASES_DE_ACCION, "after:absolute after:inset-0 sm:after:hidden")}>
                    <span className="sr-only sm:not-sr-only">{t(fila.accion.texto)}</span>
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
            )}
        </li>
    );
}
