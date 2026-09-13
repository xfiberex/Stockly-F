import { formatearImporte } from "@/shared/lib/moneda";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { ESTADO_ORDEN_COMPRA, buscarEstado } from "@/shared/lib/estados";
import { Spinner } from "@/shared/components/Spinner";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useProducts } from "@/modules/products/hooks/useProducts";
import {
    usePurchaseOrders,
    useCreatePurchaseOrder,
    useUpdatePurchaseOrder,
    useDeletePurchaseOrder,
} from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { exportPurchaseOrdersCsv } from "@/modules/purchase-orders/api/purchase-orders.api";
import type { PurchaseOrder, CreatePurchaseOrderForm } from "@/modules/purchase-orders/types/purchase-orders.types";
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { aNumero } from "@/shared/contratos";
import type { Clave } from "@/shared/i18n/traducir";
import { formatearFecha } from "@/shared/lib/fechas";
import { CLASES_BOTON_ICONO } from "@/shared/lib/clasesDeBoton";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

// Etiqueta, color e icono del estado salen del mismo descriptor (T2-38): pendiente
// es un aviso —hay algo por hacer—, recibida es el final correcto y cancelada, el
// negativo.

function orderTotal(order: PurchaseOrder): number {
    return order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
}

/** El número corto con el que la orden aparece en la lista. */
function numeroDeOrden(id: string): string {
    return id.slice(0, 8).toUpperCase();
}

/**
 * Los ítems que retiran stock al cancelar una orden recibida. Solo los ligados a un producto
 * del catálogo: el backend descuenta con `where: { productId: { not: null } }`
 * (`purchase-orders.service.ts`), igual que las ventas reponen en T2-42.
 */
function itemsQueRetiran(order: PurchaseOrder) {
    return order.items.filter((item) => item.productId !== null);
}

// ── Confirmación de cancelación de una orden recibida ─────────────────────────

interface CancelarRecepcionModalProps {
    orden: PurchaseOrder | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * T5-01 — cancelar una orden **ya recibida** retira del inventario lo que entró con ella
 * (T0-04). El backend lo permitía desde entonces, pero la interfaz solo ofrecía cancelar las
 * pendientes: el camino existía por API y no desde la aplicación, lo mismo que T2-42 corrigió
 * en ventas. Pide confirmación por la misma razón: lo que se confirma es el movimiento de
 * stock, no el cambio de estado.
 *
 * El diálogo dice además que **el coste medio no cambia**, que es la decisión tomada en la
 * ficha, y que la cancelación se rechaza entera si esas unidades ya salieron.
 */
function CancelarRecepcionModal({ orden, isPending, onConfirm, onClose }: CancelarRecepcionModalProps) {
    const { t, tn } = useT();
    const items = orden ? itemsQueRetiran(orden) : [];
    const unidades = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Modal isOpen={orden !== null} onClose={onClose} title={t("compras.cancelar.titulo")}>
            {orden && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-foreground">
                        {/* El número va suelto y no con `compras.numero` («Orden #…»), a diferencia
                            de ventas: la frase ya dice «la orden», y se leía «La orden Orden #…». */}
                        {t("compras.cancelar.explicacion", { numero: numeroDeOrden(orden.id) })}
                    </p>

                    {unidades > 0 ? (
                        <div className="rounded-lg border border-border bg-surface-muted p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                {tn("compras.cancelar.retiraran", unidades)}
                            </p>
                            <ul className="mt-2 space-y-1">
                                {items.map((item) => (
                                    <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
                                        <span className="text-foreground">{item.productName}</span>
                                        <span className="tabular-nums text-foreground-muted">−{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-sm text-foreground-muted">{t("compras.cancelar.sinInventario")}</p>
                    )}

                    <ul className="list-disc space-y-1 pl-5 text-xs text-foreground-muted">
                        {unidades > 0 && <li>{t("compras.cancelar.consumidas")}</li>}
                        {unidades > 0 && <li>{t("compras.cancelar.costeIntacto")}</li>}
                        <li>{t("compras.cancelar.irreversible")}</li>
                    </ul>

                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                        <Button type="button" variant="secondary" onClick={onClose}>{t("comun.volver")}</Button>
                        <Button type="button" variant="danger" isLoading={isPending} onClick={onConfirm}>
                            {t("compras.cancelar.confirmar")}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Formulario nueva orden ────────────────────────────────────────────────────

interface OrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function OrderFormModal({ isOpen, onClose }: OrderFormModalProps) {
    const { t, te } = useT();
    const { data: suppliers = [] } = useSuppliers();
    const { data: productsData } = useProducts({ limit: 100, isActive: true });
    const products = productsData?.data ?? [];
    const createMutation = useCreatePurchaseOrder();

    const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<CreatePurchaseOrderForm>({
        defaultValues: { items: [{ productName: "", quantity: 1, unitPrice: 0 }] },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    const supplierOptions = [
        { value: "", label: t("productos.sinProveedor") },
        ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ];

    const productOptions = [
        { value: "", label: t("ordenes.escribirManualmente") },
        ...products.map((p) => ({ value: p.id, label: p.name })),
    ];

    const handleProductSelect = (idx: number, productId: string) => {
        const product = products.find((p) => p.id === productId);
        if (product) {
            setValue(`items.${idx}.productId`, productId);
            setValue(`items.${idx}.productName`, product.name);
            // T5-01 — el precio de compra se propone desde el **coste**, no desde el precio de
            // venta: lo que se escriba aquí es lo que la recepción promediará. Sin coste
            // conocido se sigue proponiendo el de venta, y hay que corregirlo a mano.
            setValue(`items.${idx}.unitPrice`, product.costPrice !== null ? aNumero(product.costPrice) : Number(product.price));
        }
    };

    const onSubmit = (data: CreatePurchaseOrderForm) => {
        const payload = {
            ...data,
            supplierId: data.supplierId || undefined,
            items: data.items.map((item) => ({
                ...item,
                productId: item.productId || undefined,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
        };
        createMutation.mutate(payload, {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("compras.nuevaOrden")} className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <Select
                        id="supplierId"
                        label={t("productos.campo.proveedor")}
                        options={supplierOptions}
                        {...register("supplierId")}
                    />
                    <Input
                        id="notes"
                        label={t("ordenes.notas")}
                        placeholder={t("ordenes.ejemploNotas")}
                        {...register("notes")}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{t("ordenes.items")}</p>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => append({ productName: "", quantity: 1, unitPrice: 0 })}
                        >
                            <PlusIcon className="h-3.5 w-3.5" />
                            {t("ordenes.agregarItem")}
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {fields.map((field, idx) => (
                            <div key={field.id} className="grid grid-cols-2 gap-2 items-end border border-border rounded-lg p-3 bg-surface-muted md:grid-cols-12">
                                <div className="col-span-2 md:col-span-4">
                                    <Select
                                        label={t("ordenes.producto")}
                                        options={productOptions}
                                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-3">
                                    <Input
                                        label={t("comun.nombre")}
                                        placeholder={t("ordenes.nombreItem")}
                                        error={te(errors.items?.[idx]?.productName?.message)}
                                        {...register(`items.${idx}.productName`, {
                                            required: "validacion.obligatorio" satisfies Clave,
                                        })}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <Input
                                        label={t("ordenes.cantidadCorta")}
                                        type="number"
                                        min="1"
                                        {...register(`items.${idx}.quantity`)}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <Input
                                        label={t("ordenes.precioUnitario")}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        {...register(`items.${idx}.unitPrice`)}
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end md:col-span-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={CLASES_BOTON_ICONO}
                                        disabled={fields.length === 1}
                                        onClick={() => remove(idx)}
                                    >
                                        <TrashIcon className="h-4 w-4 text-danger" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={createMutation.isPending}>{t("ordenes.crear")}</Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

// Mismo tamaño de página que productos y órdenes de venta.
const PAGE_SIZE = 10;

export default function PurchaseOrdersPage() {
    const { t, tn, idioma } = useT();
    const [formOpen, setFormOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [ordenACancelar, setOrdenACancelar] = useState<PurchaseOrder | null>(null);

    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const [page, setPage] = useState(1);

    const { data, isLoading } = usePurchaseOrders({ page, limit: PAGE_SIZE });
    const orders = data?.data ?? [];
    const total = data?.meta.total ?? 0;
    const totalPages = data?.meta.totalPages ?? 1;

    const updateMutation = useUpdatePurchaseOrder();
    const deleteMutation = useDeletePurchaseOrder();

    const handleReceive = (id: string) => {
        updateMutation.mutate({ id, dto: { status: "RECEIVED" } });
    };

    const handleCancel = (id: string) => {
        updateMutation.mutate({ id, dto: { status: "CANCELLED" } });
    };

    // La orden recibida se cancela desde el diálogo, no desde la fila. Si el backend la
    // rechaza —las unidades ya se vendieron—, el diálogo se queda abierto con el aviso.
    const confirmarCancelacionDeRecepcion = () => {
        if (!ordenACancelar) return;
        updateMutation.mutate(
            { id: ordenACancelar.id, dto: { status: "CANCELLED" } },
            { onSuccess: () => setOrdenACancelar(null) },
        );
    };

    // Si se borra la última orden de la última página, esa página deja de existir:
    // se retrocede en el propio evento, sin efecto que reaccione al cambio de datos.
    const handleDelete = (id: string) => {
        const eraLaUnica = orders.length === 1 && page > 1;
        deleteMutation.mutate(id, {
            onSuccess: () => {
                if (eraLaUnica) setPage((p) => p - 1);
            },
        });
    };

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.ordenesCompra")}</h1>
                    {/* El plural sale de `tn()`: «orden»/«órdenes» no se distinguen por una
                        «s», y en otro idioma tampoco. */}
                    <p className="text-sm text-foreground-muted mt-1">{tn("ordenes.total", total)}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    <DropdownButton
                        label={t("ordenes.exportar")}
                        icon={ArrowDownTrayIcon}
                        items={[{ label: t("ordenes.exportarCsv"), onClick: exportPurchaseOrdersCsv }]}
                    />
                    {isAdmin && (
                        <Button onClick={() => setFormOpen(true)}>
                            <PlusIcon className="h-4 w-4" />
                            {t("ordenes.nueva")}
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">{t("compras.vacio")}</div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                            {/* Row header */}
                            <div
                                className="flex flex-col gap-3 px-4 py-4 cursor-pointer hover:bg-surface-muted transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="shrink-0"><EstadoBadge estado={buscarEstado(ESTADO_ORDEN_COMPRA, order.status)} /></span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {t("compras.numero", { numero: order.id.slice(0, 8).toUpperCase() })}
                                        </p>
                                        <p className="text-xs text-foreground-muted">
                                            {order.supplier?.name ?? t("productos.sinProveedor")} · {formatearFecha(idioma, order.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
                                    <div className="sm:text-right">
                                        <p className="text-sm font-semibold text-foreground tabular-nums">
                                            {formatearImporte(orderTotal(order))}
                                        </p>
                                        <p className="text-xs text-foreground-muted">{tn("ordenes.items", order.items.length)}</p>
                                    </div>
                                    {isAdmin && order.status === "PENDING" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                className={CLASES_BOTON_ICONO}
                                                title={t("compras.marcarRecibida")}
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleReceive(order.id)}
                                            >
                                                <CheckIcon className="h-4 w-4 text-success" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className={CLASES_BOTON_ICONO}
                                                title={t("compras.cancelarOrden")}
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleCancel(order.id)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-warning" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className={CLASES_BOTON_ICONO}
                                                title={t("comun.eliminar")}
                                                isLoading={deleteMutation.isPending}
                                                onClick={() => handleDelete(order.id)}
                                            >
                                                <TrashIcon className="h-4 w-4 text-danger" />
                                            </Button>
                                        </div>
                                    )}
                                    {/* T5-01: una orden recibida también se puede cancelar, y eso retira
                                        su stock (T0-04). No lleva «Eliminar»: el backend no permite borrar
                                        una orden ya recibida. */}
                                    {isAdmin && order.status === "RECEIVED" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                className={CLASES_BOTON_ICONO}
                                                title={t("compras.cancelarRecibida")}
                                                aria-label={t("compras.cancelarRecibidaDe", { numero: numeroDeOrden(order.id) })}
                                                onClick={() => setOrdenACancelar(order)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-warning" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expanded items */}
                            {expandedId === order.id && (
                                <div className="border-t border-border px-5 py-4">
                                    {order.notes && (
                                        <p className="text-xs text-foreground-muted mb-3 italic">"{order.notes}"</p>
                                    )}
                                    <div className={CLASES_TABLA_DESPLAZABLE}>
                                        <table className={CLASES_TABLA}>
                                            <thead className="text-left text-xs font-medium uppercase tracking-wide text-foreground-muted border-b border-border">
                                                <tr>
                                                    <th className="pb-2">{t("ordenes.producto")}</th>
                                                    <th className="pb-2 text-right">{t("ordenes.cantidadCorta")}</th>
                                                    <th className="pb-2 text-right">{t("ordenes.precioUnitario")}</th>
                                                    <th className="pb-2 text-right">{t("ordenes.subtotal")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {order.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="py-2 text-foreground">{item.productName}</td>
                                                        <td className="py-2 text-right text-foreground-muted">{item.quantity}</td>
                                                        <td className="py-2 text-right text-foreground-muted">{formatearImporte(item.unitPrice)}</td>
                                                        <td className="py-2 text-right font-medium text-foreground">
                                                            {formatearImporte(Number(item.unitPrice) * item.quantity)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="border-t border-border">
                                                <tr>
                                                    <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-foreground">{t("comun.total")}</td>
                                                    <td className="pt-2 text-right font-bold text-foreground">
                                                        {formatearImporte(orderTotal(order))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{t("comun.paginaDeTotal", { pagina: page, total: totalPages })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            {t("comun.anterior")}
                        </Button>
                        <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                            {t("comun.siguiente")}
                        </Button>
                    </div>
                </div>
            )}

            <OrderFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} />
            <CancelarRecepcionModal
                orden={ordenACancelar}
                isPending={updateMutation.isPending}
                onConfirm={confirmarCancelacionDeRecepcion}
                onClose={() => setOrdenACancelar(null)}
            />
        </div>
    );
}
