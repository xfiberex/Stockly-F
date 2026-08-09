import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { ESTADO_ORDEN_VENTA, buscarEstado } from "@/shared/lib/estados";
import { Spinner } from "@/shared/components/Spinner";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useProducts } from "@/modules/products/hooks/useProducts";
import {
    useSaleOrders,
    useCreateSaleOrder,
    useUpdateSaleOrder,
    useDeleteSaleOrder,
} from "@/modules/sale-orders/hooks/useSaleOrders";
import { exportSaleOrdersCsv } from "@/modules/sale-orders/api/sale-orders.api";
import type { SaleOrder, CreateSaleOrderDto } from "@/modules/sale-orders/types/sale-orders.types";
import { PlusIcon, TrashIcon, TruckIcon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

// Mismo criterio que en las órdenes de compra: el descriptor de `shared/lib/estados`
// lleva etiqueta, color e icono juntos (T2-38).

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function orderTotal(order: SaleOrder): number {
    return order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
}

/** El número corto con el que la orden aparece en la lista. */
function numeroDeOrden(id: string): string {
    return id.slice(0, 8).toUpperCase();
}

/**
 * Los ítems que devuelven stock al cancelar. Solo cuentan los que están ligados a un
 * producto del catálogo: el backend repone con `where: { productId: { not: null } }`
 * (`sale-orders.service.ts`), así que un ítem escrito a mano no mueve inventario y
 * prometerlo en el diálogo sería mentir.
 */
function itemsQueReponen(order: SaleOrder) {
    return order.items.filter((item) => item.productId !== null);
}

// ── Confirmación de cancelación de una orden enviada ──────────────────────────

interface CancelarEnvioModalProps {
    orden: SaleOrder | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * T2-42: cancelar una orden **ya enviada** devuelve unidades al inventario (T0-03), a
 * diferencia de cancelar una pendiente, que no toca nada. Por eso esta acción pide
 * confirmación y las otras de la fila no: lo que se confirma no es el cambio de estado,
 * es el movimiento de stock, y el diálogo dice exactamente cuánto se va a reponer.
 */
function CancelarEnvioModal({ orden, isPending, onConfirm, onClose }: CancelarEnvioModalProps) {
    const items = orden ? itemsQueReponen(orden) : [];
    const unidades = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Modal isOpen={orden !== null} onClose={onClose} title="Cancelar una orden ya enviada">
            {orden && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-foreground">
                        La orden <span className="font-semibold">Venta #{numeroDeOrden(orden.id)}</span> ya
                        fue enviada, así que su mercancía salió del inventario. Cancelarla la devuelve.
                    </p>

                    {unidades > 0 ? (
                        <div className="rounded-lg border border-border bg-surface-muted p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                Se repondrán <span className="tabular-nums">{unidades}</span>{" "}
                                {unidades === 1 ? "unidad" : "unidades"}
                            </p>
                            <ul className="mt-2 space-y-1">
                                {items.map((item) => (
                                    <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
                                        <span className="text-foreground">{item.productName}</span>
                                        <span className="tabular-nums text-foreground-muted">+{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-sm text-foreground-muted">
                            Ningún ítem de esta orden está ligado a un producto del catálogo, así que el
                            inventario no cambiará.
                        </p>
                    )}

                    <p className="text-xs text-foreground-muted">
                        Una orden cancelada ya no se puede modificar.
                    </p>

                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                        <Button type="button" variant="secondary" onClick={onClose}>Volver</Button>
                        <Button type="button" variant="danger" isLoading={isPending} onClick={onConfirm}>
                            Cancelar la orden
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Formulario nueva orden ────────────────────────────────────────────────────

interface OrderFormModalProps { isOpen: boolean; onClose: () => void; }

function OrderFormModal({ isOpen, onClose }: OrderFormModalProps) {
    const { data: productsData } = useProducts({ limit: 200, isActive: true });
    const products = productsData?.data ?? [];
    const createMutation = useCreateSaleOrder();

    const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<CreateSaleOrderDto>({
        defaultValues: { items: [{ productName: "", quantity: 1, unitPrice: 0 }] },
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

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

    const onSubmit = (formData: CreateSaleOrderDto) => {
        const payload: CreateSaleOrderDto = {
            customerName: formData.customerName || undefined,
            customerEmail: formData.customerEmail || undefined,
            customerPhone: formData.customerPhone || undefined,
            notes: formData.notes || undefined,
            items: formData.items.map((item) => ({
                productId: item.productId || undefined,
                productName: item.productName,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
        };
        createMutation.mutate(payload, {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva orden de venta" className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <Input id="customerName" label="Nombre del cliente" placeholder="Ej: Juan García" {...register("customerName")} />
                    <Input id="customerEmail" label="Correo" type="email" placeholder="cliente@email.com" {...register("customerEmail")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Input id="customerPhone" label="Teléfono" placeholder="+52 55 ..." {...register("customerPhone")} />
                    <Input id="notes" label="Notas" placeholder="Observaciones..." {...register("notes")} />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">Ítems *</p>
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
                            <div key={field.id} className="grid grid-cols-2 gap-2 items-end border border-border rounded-lg p-3 bg-surface-muted md:grid-cols-12">
                                <div className="col-span-2 md:col-span-4">
                                    <Select
                                        label="Producto"
                                        options={productOptions}
                                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-3">
                                    <Input
                                        label="Nombre"
                                        placeholder="Nombre del ítem"
                                        error={errors.items?.[idx]?.productName?.message}
                                        {...register(`items.${idx}.productName`, { required: "Obligatorio" })}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <Input label="Cant." type="number" min="1" {...register(`items.${idx}.quantity`)} />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <Input label="P. unit." type="number" step="0.01" min="0" {...register(`items.${idx}.unitPrice`)} />
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
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={createMutation.isPending}>Crear orden</Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SaleOrdersPage() {
    const [formOpen, setFormOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [ordenACancelar, setOrdenACancelar] = useState<SaleOrder | null>(null);

    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const { data, isLoading } = useSaleOrders();
    const orders = data?.data ?? [];
    const updateMutation = useUpdateSaleOrder();
    const deleteMutation = useDeleteSaleOrder();

    const handleShip = (id: string) => updateMutation.mutate({ id, dto: { status: "SHIPPED" } });
    const handleCancel = (id: string) => updateMutation.mutate({ id, dto: { status: "CANCELLED" } });

    // La orden enviada se cancela desde el diálogo, no desde la fila: es la única de las
    // acciones de esta página que mueve inventario.
    const confirmarCancelacionDeEnvio = () => {
        if (!ordenACancelar) return;
        updateMutation.mutate(
            { id: ordenACancelar.id, dto: { status: "CANCELLED" } },
            { onSuccess: () => setOrdenACancelar(null) },
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Órdenes de venta</h1>
                    <p className="text-sm text-foreground-muted mt-1">{orders.length} orden{orders.length !== 1 ? "es" : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <DropdownButton
                        label="Exportar"
                        icon={ArrowDownTrayIcon}
                        items={[{ label: "Exportar CSV", onClick: exportSaleOrdersCsv }]}
                    />
                    {isAdmin && (
                        <Button onClick={() => setFormOpen(true)}>
                            <PlusIcon className="h-4 w-4" />
                            Nueva orden
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">No hay órdenes de venta. Crea la primera.</div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                            <div
                                className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-surface-muted transition-colors"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <EstadoBadge estado={buscarEstado(ESTADO_ORDEN_VENTA, order.status)} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            Venta #{order.id.slice(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-foreground-muted">
                                            {order.customerName ?? "Cliente sin nombre"} · {formatDate(order.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-foreground tabular-nums">
                                            ${orderTotal(order).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-foreground-muted">{order.items.length} ítem{order.items.length !== 1 ? "s" : ""}</p>
                                    </div>
                                    {isAdmin && order.status === "PENDING" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                title="Marcar como enviado"
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleShip(order.id)}
                                            >
                                                <TruckIcon className="h-4 w-4 text-success" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                title="Cancelar orden"
                                                isLoading={updateMutation.isPending}
                                                onClick={() => handleCancel(order.id)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-warning" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                title="Eliminar"
                                                isLoading={deleteMutation.isPending}
                                                onClick={() => deleteMutation.mutate(order.id)}
                                            >
                                                <TrashIcon className="h-4 w-4 text-danger" />
                                            </Button>
                                        </div>
                                    )}
                                    {/* T2-42: una orden enviada también se puede cancelar, y eso repone
                                        el stock (T0-03). No lleva «Eliminar»: el backend no permite
                                        borrar una orden ya enviada. */}
                                    {isAdmin && order.status === "SHIPPED" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                title="Cancelar orden enviada"
                                                aria-label={`Cancelar la orden enviada Venta #${numeroDeOrden(order.id)}`}
                                                onClick={() => setOrdenACancelar(order)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-warning" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {expandedId === order.id && (
                                <div className="border-t border-border px-5 py-4">
                                    {(order.customerEmail || order.customerPhone) && (
                                        <div className="flex gap-4 mb-3 text-xs text-foreground-muted">
                                            {order.customerEmail && <span>✉ {order.customerEmail}</span>}
                                            {order.customerPhone && <span>📞 {order.customerPhone}</span>}
                                        </div>
                                    )}
                                    {order.notes && (
                                        <p className="text-xs text-foreground-muted mb-3 italic">"{order.notes}"</p>
                                    )}
                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs font-medium uppercase tracking-wide text-foreground-muted border-b border-border">
                                            <tr>
                                                <th className="pb-2">Producto</th>
                                                <th className="pb-2 text-right">Cant.</th>
                                                <th className="pb-2 text-right">P. unit.</th>
                                                <th className="pb-2 text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {order.items.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="py-2 text-foreground">{item.productName}</td>
                                                    <td className="py-2 text-right text-foreground-muted">{item.quantity}</td>
                                                    <td className="py-2 text-right text-foreground-muted">${Number(item.unitPrice).toFixed(2)}</td>
                                                    <td className="py-2 text-right font-medium text-foreground">
                                                        ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="border-t border-border">
                                            <tr>
                                                <td colSpan={3} className="pt-2 text-right text-sm font-semibold text-foreground">Total</td>
                                                <td className="pt-2 text-right font-bold text-foreground">
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
            <CancelarEnvioModal
                orden={ordenACancelar}
                isPending={updateMutation.isPending}
                onConfirm={confirmarCancelacionDeEnvio}
                onClose={() => setOrdenACancelar(null)}
            />
        </div>
    );
}
