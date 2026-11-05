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
import { formatearDia } from "@/shared/lib/fechas";
import { useAtencionDeHoy, type FilaDeAtencion, type Recuento } from "../hooks/useAtencionDeHoy";
import { DESTINOS } from "../destinos";

/** Cuántos productos de la lista de stock bajo caben en el panel antes de mandar a la lista. */
const PRODUCTOS_A_LA_VISTA = 5;

/**
 * Enlace de acción de una fila: texto con el color de enlace de la aplicación, pero con la
 * altura del mínimo táctil (§4 del sistema de diseño) aunque la marca sea pequeña.
 */
const CLASES_DE_ACCION =
    "inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-lg text-sm font-medium text-info hover:underline md:pointer-fine:min-h-9";

interface Fila {
    clave: FilaDeAtencion;
    etiqueta: Clave;
    detalles: string[];
    recuento: Recuento;
    Icon: React.ElementType;
    /** `peligro`: algo ya está mal (lotes caducados); `aviso`: hay que hacer algo. */
    gravedad: "aviso" | "peligro";
    accion: { texto: Clave; to: string };
}

/**
 * Lo primero del panel: qué hay que hacer hoy. Las filas son las del rol (`filas`) y se
 * pintan siempre, también a cero y mientras cargan: así el bloque mide lo mismo y no empuja lo
 * que viene debajo. Una fila a cero se atenúa y pierde su acción; una con algo pendiente lleva
 * el color de su estado y su enlace.
 *
 * AUD-008, paso 8 — se monta **antes** de que llegue `/reports`. Solo la fila de stock sale de
 * ahí; las demás tienen sus consultas, que antes esperaban a que el panel dejara de enseñar el
 * esqueleto (con Slow 4G empezaban a los 11 s).
 */
export function AtencionDeHoy({
    filas: visibles,
    stock,
    lowStockProducts,
}: {
    filas: readonly FilaDeAtencion[];
    /** Sale de `/reports`, que pide el panel: si falla, la fila dice «no disponible» y el resto sigue. */
    stock: Recuento;
    /** `null` mientras `/reports` no ha llegado. */
    lowStockProducts: ReportSummary["lowStockProducts"] | null;
}) {
    const { t, tn, idioma } = useT();
    const { user } = useAuth();
    const { caducidades, diasDeCaducidad, unidadesCaducadas, primerLote, conteos, compras, ventas } = useAtencionDeHoy(visibles);

    const detallesDeCaducidad: string[] = [];
    if (diasDeCaducidad !== undefined) {
        detallesDeCaducidad.push(
            unidadesCaducadas > 0
                ? tn("dashboard.atencion.caducadas", unidadesCaducadas)
                : t("dashboard.atencion.plazo", { dias: diasDeCaducidad }),
        );
    }
    if (primerLote) {
        detallesDeCaducidad.push(
            t(primerLote.expired ? "dashboard.atencion.primerLoteCaducado" : "dashboard.atencion.primerLote", {
                lote: primerLote.code,
                producto: primerLote.productName,
                fecha: formatearDia(idioma, primerLote.expiresAt),
            }),
        );
    }

    const todas: Fila[] = [
        {
            clave: "stock",
            etiqueta: "dashboard.atencion.stock",
            detalles: [],
            recuento: stock,
            Icon: CubeIcon,
            gravedad: lowStockProducts?.some((p) => p.stock === 0) ? "peligro" : "aviso",
            // La reposición sugerida es de ADMIN (`routes/index.tsx`); el resto ve los productos.
            accion:
                user?.role === "ADMIN"
                    ? { texto: "dashboard.atencion.reponer", to: "/purchase-orders/suggestions" }
                    : { texto: "dashboard.atencion.verProductos", to: DESTINOS.stockBajo },
        },
        {
            clave: "caducidades",
            etiqueta: "dashboard.atencion.caducidades",
            detalles: detallesDeCaducidad,
            recuento: caducidades,
            Icon: ClockIcon,
            gravedad: unidadesCaducadas > 0 ? "peligro" : "aviso",
            accion: { texto: "dashboard.atencion.verCaducidades", to: DESTINOS.caducidades },
        },
        {
            clave: "conteos",
            etiqueta: "dashboard.atencion.conteos",
            detalles: [],
            recuento: conteos,
            Icon: ClipboardDocumentCheckIcon,
            gravedad: "aviso",
            accion: { texto: "dashboard.atencion.verConteos", to: DESTINOS.conteos },
        },
        {
            clave: "compras",
            etiqueta: "dashboard.atencion.compras",
            detalles: [],
            recuento: compras,
            Icon: InboxArrowDownIcon,
            gravedad: "aviso",
            accion: { texto: "dashboard.atencion.verCompras", to: DESTINOS.compras },
        },
        {
            clave: "ventas",
            etiqueta: "dashboard.atencion.ventas",
            detalles: [],
            recuento: ventas,
            Icon: TruckIcon,
            gravedad: "aviso",
            accion: { texto: "dashboard.atencion.verVentas", to: DESTINOS.ventas },
        },
    ];
    // El orden es el de `todas`, no el de quien llama: el mismo dato cae siempre en el mismo sitio.
    const filas = todas.filter((f) => visibles.includes(f.clave));

    const todoCargado = filas.every((f) => !f.recuento.cargando);
    const alDia = todoCargado && filas.every((f) => f.recuento.valor === 0);
    // Mientras carga se reserva la columna: si al llegar hay productos, no aparece de golpe.
    const conReposicion = visibles.includes("stock") && (lowStockProducts === null ? stock.cargando : lowStockProducts.length > 0);

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
                        {lowStockProducts === null ? (
                            <ul className="mt-2 divide-y divide-border" aria-hidden="true">
                                {Array.from({ length: PRODUCTOS_A_LA_VISTA }, (_, i) => (
                                    <li key={i} className="flex min-h-11 items-center justify-between gap-3 py-2">
                                        <Barra className={i % 2 ? "w-32" : "w-40"} />
                                        <Barra className="w-24" />
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <ul className="mt-2 divide-y divide-border">
                                {lowStockProducts.slice(0, PRODUCTOS_A_LA_VISTA).map((p) => (
                                    // El enlace se estira sobre la fila: el blanco táctil es la fila entera,
                                    // no la línea del nombre.
                                    <li key={p.id} className="relative flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 py-2">
                                        <Link
                                            to={`/catalog/products/${p.id}/movements`}
                                            title={p.name}
                                            className="min-w-0 max-w-full truncate text-sm font-medium text-foreground after:absolute after:inset-0 hover:underline"
                                        >
                                            {p.name}
                                        </Link>
                                        <span className="flex shrink-0 items-center gap-2 text-sm">
                                            <span className="tabular-nums text-foreground-muted">
                                                {/* AUD-008, paso 10 — «mín. 0» no es un mínimo: es que nadie lo puso. */}
                                                {p.minStock > 0
                                                    ? t("dashboard.unidadesMinimo", { stock: p.stock, minimo: p.minStock })
                                                    : t("dashboard.sinMinimo", { stock: p.stock })}
                                            </span>
                                            <EstadoBadge estado={NIVEL_STOCK[nivelDeStock(p.stock, p.minStock)]} />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {(stock.valor ?? 0) > PRODUCTOS_A_LA_VISTA && (
                            <Link to={DESTINOS.stockBajo} className={CLASES_DE_ACCION}>
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
    // AUD-008, paso 10 — «no disponible» en tono de aviso: en gris se leía como una fila a cero.
    const color = error ? "text-warning" : !pendiente ? "text-foreground-muted" : fila.gravedad === "peligro" ? "text-danger" : "text-warning";
    const Icon = valor === 0 ? CheckCircleIcon : fila.Icon;
    const detalles = error ? [t("dashboard.atencion.noDisponible")] : pendiente ? fila.detalles : [];

    return (
        // La cifra va delante y en un ancho fijo: quedan en columna y la fila se lee como una
        // frase («4 · Productos con stock bajo»). AUD-008, paso 9: la cifra es lo más grande
        // del panel —es lo que pide actuar—, por encima de los recuentos y los importes.
        <li className="relative flex min-h-11 items-center gap-3 py-2 first:pt-0 last:pb-0">
            <Icon className={cn("h-5 w-5 shrink-0", color)} aria-hidden="true" />
            <span className={cn("w-10 shrink-0 text-right text-2xl font-semibold tabular-nums", color)}>
                {cargando ? (
                    <Barra className="ml-auto h-5 w-7" />
                ) : error ? (
                    <span aria-hidden="true">—</span>
                ) : (
                    valor
                )}
            </span>
            <div className="min-w-0 flex-1">
                <p className={cn("text-sm", pendiente ? "font-medium text-foreground" : "text-foreground-muted")}>
                    {t(fila.etiqueta)}
                </p>
                {detalles.map((detalle) => (
                    <p key={detalle} className={cn("text-xs", color)}>
                        {detalle}
                    </p>
                ))}
            </div>
            {/* En móvil la fila entera es el enlace y solo se ve la flecha: el texto de la
                acción, en otra línea, hacía cada fila el doble de alta. Su nombre accesible
                empieza por lo que se ve en la fila (WCAG 2.5.3), y desde `sm` se ve también la
                acción. Sin acción, un hueco de la misma altura: la fila no crece al llegar la
                cifra (AUD-008, paso 8). */}
            {pendiente ? (
                <Link to={fila.accion.to} className={cn(CLASES_DE_ACCION, "after:absolute after:inset-0 sm:after:hidden")}>
                    <span className="sr-only">{`${valor} ${t(fila.etiqueta)}:`}</span>{" "}
                    <span className="sr-only sm:not-sr-only">{t(fila.accion.texto)}</span>
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
            ) : (
                <span aria-hidden="true" className={cn(CLASES_DE_ACCION, "invisible")}>
                    <ChevronRightIcon className="h-4 w-4" />
                </span>
            )}
        </li>
    );
}
