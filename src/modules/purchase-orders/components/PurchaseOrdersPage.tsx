import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { Badge } from "@/shared/components/Badge";
import { Spinner } from "@/shared/components/Spinner";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useProducts } from "@/modules/products/hooks/useProducts";
import {
    usePurchaseOrders,
    useCreatePurchaseOrder,
    useUpdatePurchaseOrder,
    useDeletePurchaseOrder,
} from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import type { PurchaseOrder, CreatePurchaseOrderForm } from "@/modules/purchase-orders/types/purchase-orders.types";
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pendiente",
    RECEIVED: "Recibida",
    CANCELLED: "Cancelada",
};

const STATUS_VARIANTS: Record<string, "orange" | "success" | "danger"> = {
    PENDING: "orange",
    RECEIVED: "success",
    CANCELLED: "danger",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function orderTotal(order: PurchaseOrder): number {
    return order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
}

// ── Formulario nueva orden ────────────────────────────────────────────────────

interface OrderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function OrderFormModal({ isOpen, onClose }: OrderFormModalProps) {
    const { data: suppliers = [] } = useSuppliers();
    const { data: productsData } = useProducts({ limit: 100, isActive: true });
    const products = productsData?.data ?? [];
    const createMutation = useCreatePurchaseOrder();

    const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<CreatePurchaseOrderForm>({
        defaultValues: { items: [{ productName: "", quantity: 1, unitPrice: 0 }] },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    const supplierOptions = [
        { value: "", label: "Sin proveedor" },
        ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ];

    const productOptions = [
        { value: "", label: "Escribir manualmente" },
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
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva orden de compra" className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <Select
                        id="supplierId"
                        label="Proveedor"
                        options={supplierOptions}
                        {...register("supplierId")}
                    />
                    <Input
                        id="notes"
                        label="Notas"
                        placeholder="Observaciones..."
                        {...register("notes")}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Ítems</p>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => append({ productName: "", quantity: 1, unitPrice: 0 })}
                        >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Agregar ítem
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {fields.map((field, idx) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-3 bg-gray-50">
                                <div className="col-span-4">
                                    <Select
                                        label="Producto"
                                        options={productOptions}
                                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        label="Nombre"
                                        placeholder="Nombre del ítem"
                                        error={errors.items?.[idx]?.productName?.message}
                                        {...register(`items.${idx}.productName`, { required: "Obligatorio" })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        label="Cant."
                                        type="number"
                                        min="1"
                                        {...register(`items.${idx}.quantity`)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        label="P. unit."
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        {...register(`items.${idx}.unitPrice`)}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={fields.length === 1}
                                        onClick={() => remove(idx)}
                                    >
                                        <TrashIcon className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={createMutation.isPending}>Crear orden</Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PurchaseOrdersPage() {
    const [formOpen, setFormOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const { data: orders = [], isLoading } = usePurchaseOrders();
    const updateMutation = useUpdatePurchaseOrder();
    const deleteMutation = useDeletePurchaseOrder();

    const handleReceive = (id: string) => {
        updateMutation.mutate({ id, dto: { status: "RECEIVED" } });
    };

    const handleCancel = (id: string) => {
        updateMutation.mutate({ id, dto: { status: "CANCELLED" } });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Órdenes de compra</h1>
                    <p className="text-sm text-gray-500 mt-1">{orders.length} orden{orders.length !== 1 ? "es" : ""}</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setFormOpen(true)}>
                        <PlusIcon className="h-4 w-4" />
                        Nueva orden
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">No hay órdenes de compra. Crea la primera.</div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Row header */}
                            <div
                                className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Badge variant={STATUS_VARIANTS[order.status] ?? "default"}>
                                        {STATUS_LABELS[order.status] ?? order.status}
                                    </Badge>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            Orden #{order.id.slice(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {order.supplier?.name ?? "Sin proveedor"} · {formatDate(order.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-gray-900">
                                            ${orderTotal(order).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-gray-400">{order.items.length} ítem{order.items.length !== 1 ? "s" : ""}</p>
                                    </div>
                                    {isAdmin && order.status === "PENDING" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                title="Marcar como recibida"
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleReceive(order.id)}
                                            >
                                                <CheckIcon className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                title="Cancelar orden"
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleCancel(order.id)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-orange-500" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                title="Eliminar"
                                                isLoading={deleteMutation.isPending}
                                                onClick={() => deleteMutation.mutate(order.id)}
                                            >
                                                <TrashIcon className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expanded items */}
                            {expandedId === order.id && (
                                <div className="border-t border-gray-100 px-5 py-4">
                                    {order.notes && (
                                        <p className="text-xs text-gray-500 mb-3 italic">"{order.notes}"</p>
                                    )}
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs font-medium uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                            <tr>
                                                <th className="pb-2">Producto</th>
                                                <th className="pb-2 text-right">Cant.</th>
                                                <th className="pb-2 text-right">P. unit.</th>
                                                <th className="pb-2 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {order.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="py-2 text-gray-700">{item.productName}</td>
                                                    <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                                                    <td className="py-2 text-right text-gray-600">${Number(item.unitPrice).toFixed(2)}</td>
                                                    <td className="py-2 text-right font-medium text-gray-900">
                                                        ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t border-gray-200">
                                            <tr>
                                                <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-gray-700">Total</td>
                                                <td className="pt-2 text-right font-bold text-gray-900">
                                                    ${orderTotal(order).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
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

            <OrderFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} />
        </div>
    );
}
