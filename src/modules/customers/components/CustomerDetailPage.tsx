import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, EnvelopeIcon, PencilIcon, PhoneIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Paginacion } from "@/shared/components/Paginacion";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { ESTADO_ORDEN_VENTA, buscarEstado } from "@/shared/lib/estados";
import { formatearFecha } from "@/shared/lib/fechas";
import { formatearImporte } from "@/shared/lib/moneda";
import { CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { CustomerFormModal } from "@/modules/customers/components/CustomerFormModal";
import { useCustomer, useUpdateCustomer } from "@/modules/customers/hooks/useCustomers";
import { useSaleOrders } from "@/modules/sale-orders/hooks/useSaleOrders";
import type { SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";
import { escribirNumeroDeVenta } from "@/shared/contratos";

const PAGE_SIZE = 10;

/**
 * T6-05 — el importe de cada venta en la ficha es el **subtotal**, sin impuesto, y lo manda el
 * servidor. Es el mismo criterio que «Importe enviado», justo encima: lo que el cliente ha
 * comprado, no lo que se ha recaudado de impuesto por él.
 */
const totalDe = (orden: SaleOrder) => orden.subtotal;

/**
 * T5-06 — la ficha de un cliente: quién es, cuánto ha comprado y qué.
 *
 * El importe es **lo enviado**: una venta pendiente todavía puede cancelarse y una cancelada no
 * se cobró. Las órdenes de la tabla son todas, en cualquier estado, y cada una enseña el nombre
 * con el que se vendió, que puede no ser el de hoy.
 */
export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t, tn, idioma } = useT();
    const puede = usePuede();

    const { data: cliente, isLoading, isError } = useCustomer(id);
    const [page, setPage] = useState(1);
    const { data: ordenes, isFetching } = useSaleOrders({ customerId: id, page, limit: PAGE_SIZE });

    const [editando, setEditando] = useState(false);
    const updateMutation = useUpdateCustomer();

    const volver = (
        <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
            <ArrowLeftIcon className="h-4 w-4" />
            {t("ruta.clientes")}
        </Link>
    );

    if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
    if (isError || !cliente) {
        return (
            <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-4")}>
                {volver}
                <p className="py-12 text-center text-sm text-foreground-muted">{t("clientes.noEncontrado")}</p>
            </div>
        );
    }

    const { summary } = cliente;
    const tarjetas = [
        { label: t("clientes.tarjeta.ordenes"), value: summary.orders },
        { label: t("clientes.tarjeta.enviadas"), value: summary.shipped },
        { label: t("clientes.tarjeta.importe"), value: formatearImporte(summary.shippedRevenue) },
        {
            label: t("clientes.tarjeta.ultima"),
            value: summary.lastOrderAt ? formatearFecha(idioma, summary.lastOrderAt) : "—",
        },
    ];

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
            {volver}

            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-foreground break-words">{cliente.name}</h1>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted">
                        {cliente.email && (
                            <span className="inline-flex items-center gap-1 break-all">
                                <EnvelopeIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span className="sr-only">{t("clientes.correo")}:</span>
                                {cliente.email}
                            </span>
                        )}
                        {cliente.phone && (
                            <span className="inline-flex items-center gap-1">
                                <PhoneIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span className="sr-only">{t("clientes.telefono")}:</span>
                                {cliente.phone}
                            </span>
                        )}
                        <span>{t("clientes.clienteDesde", { fecha: formatearFecha(idioma, cliente.createdAt) })}</span>
                    </div>
                    {cliente.notes && <p className="mt-2 text-sm italic text-foreground-muted">{cliente.notes}</p>}
                </div>
                {puede("PUT /customers/:id") && (
                    <Button variant="secondary" onClick={() => setEditando(true)}>
                        <PencilIcon className="h-4 w-4" />
                        {t("comun.editar")}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {tarjetas.map(({ label, value }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                        <p className="text-base sm:text-xl font-bold tabular-nums text-foreground">{value}</p>
                        <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                    </div>
                ))}
            </div>
            <p className="-mt-3 text-xs text-foreground-muted">
                {t("clientes.importeAyuda")} {summary.pending > 0 && tn("clientes.pendientes", summary.pending)}
            </p>

            <section aria-labelledby="historial" className="space-y-3">
                <h2 id="historial" className="text-base font-semibold text-foreground">{t("clientes.historial")}</h2>
                {(ordenes?.data.length ?? 0) === 0 ? (
                    <p className="py-8 text-center text-sm text-foreground-muted">{t("clientes.sinOrdenes")}</p>
                ) : (
                    <div className={cn(CLASES_TABLA_DESPLAZABLE, "rounded-xl border border-border", isFetching && "opacity-70")}>
                        <table className={CLASES_TABLA}>
                            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                <tr>
                                    <th className="px-4 py-3">{t("clientes.orden")}</th>
                                    <th className="px-4 py-3">{t("clientes.fecha")}</th>
                                    <th className="px-4 py-3">{t("clientes.estado")}</th>
                                    <th className="px-4 py-3">{t("clientes.vendidaA")}</th>
                                    <th className="px-4 py-3 text-right">{t("comun.total")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-surface">
                                {ordenes!.data.map((orden) => (
                                    <tr key={orden.id}>
                                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                                            {t("ventas.numero", { numero: escribirNumeroDeVenta(orden.number) })}
                                        </td>
                                        <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">{formatearFecha(idioma, orden.createdAt)}</td>
                                        <td className="px-4 py-3"><EstadoBadge estado={buscarEstado(ESTADO_ORDEN_VENTA, orden.status)} /></td>
                                        <td className="px-4 py-3 text-foreground-muted">{orden.customerName ?? "—"}</td>
                                        <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">{formatearImporte(totalDe(orden))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Paginacion page={page} totalPages={ordenes?.meta.totalPages ?? 1} onPage={setPage} />
                    </div>
                )}
            </section>

            <CustomerFormModal
                key={`${cliente.id}-${editando}`}
                isOpen={editando}
                onClose={() => setEditando(false)}
                customer={cliente}
                onSubmit={(form) => updateMutation.mutate({ id: cliente.id, form }, { onSuccess: () => setEditando(false) })}
                isPending={updateMutation.isPending}
            />
        </div>
    );
}
