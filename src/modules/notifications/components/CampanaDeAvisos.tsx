import { useEffect, useId, useRef, type ComponentType, type FocusEvent, type SVGProps } from "react";
import { Link } from "react-router-dom";
import { BellIcon, ExclamationTriangleIcon, ShoppingCartIcon, TruckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { formatearDia, haceCuanto } from "@/shared/lib/fechas";
import { Spinner } from "@/shared/components/Spinner";
import { useMenuDesplegable } from "@/shared/hooks/useMenuDesplegable";
import { useT, type Traductor } from "@/shared/hooks/useIdioma";
import {
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    useUnreadCount,
} from "@/modules/notifications/hooks/useNotifications";
import type { Notification } from "@/modules/notifications/types/notification.types";

/** El número de una orden, como en sus pantallas: los ocho primeros caracteres del id. */
const numeroDe = (id: string) => id.slice(0, 8).toUpperCase();

interface Presentacion {
    Icono: ComponentType<SVGProps<SVGSVGElement>>;
    /** El color dice de qué clase es el aviso; no es la única señal: el título también lo dice. */
    tono: string;
    titulo: string;
    detalle: string;
    /** Adónde lleva. Las órdenes no tienen página propia: se va a su listado, y el título trae el número. */
    destino: string;
}

/**
 * Qué se lee en cada aviso. El servidor manda **los huecos, no la frase** (ver `avisoSchema`):
 * es aquí donde se compone, en el idioma de la pantalla.
 */
function presentar(aviso: Notification, { t, idioma }: Traductor): Presentacion {
    switch (aviso.type) {
        case "LOW_STOCK":
            return {
                Icono: ExclamationTriangleIcon,
                tono: "bg-warning-surface text-warning",
                titulo: t("avisos.stockBajo.titulo", { producto: aviso.data.productName }),
                detalle: aviso.data.stock === 0
                    ? t("avisos.stockBajo.agotado", { minimo: aviso.data.minStock })
                    : t("avisos.stockBajo.detalle", { stock: aviso.data.stock, minimo: aviso.data.minStock }),
                destino: `/catalog/products/${aviso.entityId}/movements`,
            };
        case "SALE_UNSHIPPABLE":
            return {
                Icono: ShoppingCartIcon,
                tono: "bg-danger-surface text-danger",
                titulo: t("avisos.ventaSinStock.titulo", { numero: numeroDe(aviso.entityId) }),
                detalle: t("avisos.ventaSinStock.detalle", {
                    producto: aviso.data.productName,
                    disponible: aviso.data.available,
                    requerido: aviso.data.required,
                }),
                destino: "/sale-orders",
            };
        case "PURCHASE_OVERDUE": {
            const fecha = formatearDia(idioma, aviso.data.dueDate);
            return {
                Icono: TruckIcon,
                tono: "bg-info-surface text-info",
                titulo: t("avisos.compraAtrasada.titulo", { numero: numeroDe(aviso.entityId) }),
                detalle: aviso.data.supplierName
                    ? t("avisos.compraAtrasada.detalle", { proveedor: aviso.data.supplierName, fecha })
                    : t("avisos.compraAtrasada.detalleSinProveedor", { fecha }),
                destino: "/purchase-orders",
            };
        }
    }
}

/**
 * T5-12 — la campana de la cabecera.
 *
 * La alerta de stock bajo solo salía por correo: quien tenía la aplicación abierta no se
 * enteraba. Aquí está el número de avisos sin leer, que se consulta cada minuto y al volver a
 * la pestaña, y el panel con los últimos.
 *
 * **Lo que costaba poco hacer mal:**
 *
 * - **El anuncio.** La región `aria-live` lleva el recuento y nada más, y su texto se *deriva*
 *   del número: una consulta que devuelve lo mismo no cambia el DOM, así que no se anuncia. Lo
 *   que se oye es que el número ha cambiado, no que se ha vuelto a preguntar.
 * - **El panel no es un menú.** Dentro hay enlaces y un botón, no `menuitem`s: es un diálogo
 *   no modal. Al abrirse recibe el foco —si no, el lector de pantalla se queda en el botón y
 *   no sabe que ha aparecido nada—; se cierra con Escape, que devuelve el foco a la campana
 *   (`useMenuDesplegable`), al pulsar fuera y al salir de él tabulando.
 * - **El nombre del botón dice el número.** Un «3» sobre un icono no es un nombre: la campana
 *   se llama «Avisos: 3 sin leer».
 */
export function CampanaDeAvisos() {
    const traductor = useT();
    const { t, tn, idioma } = traductor;
    const { abierto, contenedor, disparador, alternar, cerrar } = useMenuDesplegable();
    const panel = useRef<HTMLDivElement>(null);
    const idPanel = useId();
    const idTitulo = useId();

    const { data: contador } = useUnreadCount();
    const lista = useNotifications(abierto);
    const marcar = useMarkNotificationRead();
    const marcarTodos = useMarkAllNotificationsRead();

    // Con el panel abierto manda la lista, que es más reciente que el último sondeo del contador.
    const sinLeer = (abierto ? lista.data?.unread : undefined) ?? contador?.unread ?? 0;
    const avisos = lista.data?.items ?? [];

    useEffect(() => {
        if (abierto) panel.current?.focus();
    }, [abierto]);

    // Tabular hasta salir del panel lo cierra. Solo si el foco se va **a otro elemento**: al
    // pulsar en un hueco del propio panel el foco no va a ninguna parte (`relatedTarget` es
    // `null`), y cerrarlo ahí lo cerraría por tocarlo.
    const alPerderElFoco = (e: FocusEvent<HTMLDivElement>) => {
        if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) cerrar();
    };

    return (
        <div ref={contenedor} className="relative" onBlur={alPerderElFoco}>
            <p aria-live="polite" className="sr-only">
                {sinLeer > 0 ? tn("avisos.tienes", sinLeer) : ""}
            </p>

            <button
                ref={disparador}
                type="button"
                onClick={alternar}
                aria-label={sinLeer > 0 ? tn("avisos.campanaSinLeer", sinLeer) : t("avisos.titulo")}
                aria-haspopup="dialog"
                aria-expanded={abierto}
                aria-controls={abierto ? idPanel : undefined}
                className={cn(
                    "relative flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent text-foreground-muted transition-colors md:min-h-9 md:min-w-9",
                    "hover:border-border hover:bg-surface-muted",
                    "focus-visible:border-border focus-visible:bg-surface-muted focus-visible:outline-none",
                    abierto && "border-border bg-surface-muted",
                )}
            >
                <BellIcon className="h-5 w-5" />
                {sinLeer > 0 && (
                    <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-surface md:right-0 md:top-0"
                    >
                        {sinLeer > 99 ? "99+" : sinLeer}
                    </span>
                )}
            </button>

            {abierto && (
                <div
                    ref={panel}
                    id={idPanel}
                    role="dialog"
                    aria-labelledby={idTitulo}
                    tabIndex={-1}
                    // En el móvil la campana no está en el borde —a su derecha quedan la cuenta
                    // y el menú—, y un panel anclado a ella se saldría por la izquierda: ahí se
                    // fija a la ventana, con su margen. Desde `sm` cuelga de la campana.
                    className="fixed inset-x-4 top-15 z-50 rounded-xl border border-border bg-surface shadow-overlay outline-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-96"
                >
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <h2 id={idTitulo} className="text-sm font-semibold text-foreground">{t("avisos.titulo")}</h2>
                        <button
                            type="button"
                            onClick={() => marcarTodos.mutate()}
                            disabled={sinLeer === 0 || marcarTodos.isPending}
                            className="inline-flex min-h-11 items-center rounded-lg px-2 py-1 text-xs font-medium text-info underline-offset-2 md:min-h-0 hover:underline focus-visible:underline focus-visible:outline-none disabled:text-foreground-muted disabled:no-underline"
                        >
                            {t("avisos.marcarTodos")}
                        </button>
                    </div>

                    {lista.isPending ? (
                        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
                    ) : lista.isError ? (
                        <p className="px-4 py-8 text-center text-sm text-foreground-muted">{t("avisos.error")}</p>
                    ) : avisos.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-foreground-muted">{t("avisos.vacio")}</p>
                    ) : (
                        <ul className="max-h-[min(26rem,calc(100dvh-9rem))] divide-y divide-border overflow-y-auto overscroll-contain">
                            {avisos.map((aviso) => {
                                const { Icono, tono, titulo, detalle, destino } = presentar(aviso, traductor);
                                const nuevo = aviso.readAt === null;
                                return (
                                    <li key={aviso.id}>
                                        <Link
                                            to={destino}
                                            onClick={() => {
                                                if (nuevo) marcar.mutate(aviso.id);
                                                cerrar();
                                            }}
                                            className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none"
                                        >
                                            <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tono)}>
                                                <Icono className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={cn("block text-sm text-foreground", nuevo ? "font-semibold" : "font-medium")}>
                                                    {/* El punto no puede ser la única señal de «sin leer». */}
                                                    {nuevo && <span className="sr-only">{t("avisos.sinLeer")}</span>}{nuevo && " "}
                                                    {titulo}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-foreground-muted">{detalle}</span>
                                                <span className="mt-1 block text-xs text-foreground-muted">{haceCuanto(idioma, aviso.createdAt)}</span>
                                            </span>
                                            {nuevo && <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-info" />}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
