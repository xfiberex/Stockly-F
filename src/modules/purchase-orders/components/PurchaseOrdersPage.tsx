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
import type { Clave } from "@/shared/i18n/traducir";
import { formatearFecha } from "@/shared/lib/fechas";

// Etiqueta, color e icono del estado salen del mismo descriptor (T2-38): pendiente
// es un aviso —hay algo por hacer—, recibida es el final correcto y cancelada, el
// negativo.

function orderTotal(order: PurchaseOrder): number {
    return order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
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
            setValue(`items.${idx}.unitPrice`, Number(product.price));
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
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.ordenesCompra")}</h1>
                    {/* El plural sale de `tn()`: «orden»/«órdenes» no se distinguen por una
                        «s», y en otro idioma tampoco. */}
                    <p className="text-sm text-foreground-muted mt-1">{tn("ordenes.total", total)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
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
                                className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-surface-muted transition-colors"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <EstadoBadge estado={buscarEstado(ESTADO_ORDEN_COMPRA, order.status)} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {t("compras.numero", { numero: order.id.slice(0, 8).toUpperCase() })}
                                        </p>
                                        <p className="text-xs text-foreground-muted">
                                            {order.supplier?.name ?? t("productos.sinProveedor")} · {formatearFecha(idioma, order.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-foreground tabular-nums">
                                            {formatearImporte(orderTotal(order))}
                                        </p>
                                        <p className="text-xs text-foreground-muted">{tn("ordenes.items", order.items.length)}</p>
                                    </div>
                                    {isAdmin && order.status === "PENDING" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                title={t("compras.marcarRecibida")}
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleReceive(order.id)}
                                            >
                                                <CheckIcon className="h-4 w-4 text-success" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                title={t("compras.cancelarOrden")}
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleCancel(order.id)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-warning" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                title={t("comun.eliminar")}
                                                isLoading={deleteMutation.isPending}
                                                onClick={() => handleDelete(order.id)}
                                            >
                                                <TrashIcon className="h-4 w-4 text-danger" />
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
                                    <table className="w-full text-sm">
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
        </div>
    );
}
