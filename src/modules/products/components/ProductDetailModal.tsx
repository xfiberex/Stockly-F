import { Link } from "react-router-dom";
import { Modal } from "@/shared/components/Modal";
import { Badge } from "@/shared/components/Badge";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { NIVEL_STOCK, ACTIVIDAD, nivelDeStock } from "@/shared/lib/estados";
import { Button } from "@/shared/components/Button";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { Product } from "@/modules/products/types/product.types";
import {
    ChartBarIcon,
    PencilIcon,
    CubeIcon,
    CurrencyDollarIcon,
    TagIcon,
    TruckIcon,
    ExclamationTriangleIcon,
    CalendarDaysIcon,
} from "@heroicons/react/24/outline";

interface ProductDetailModalProps {
    product: Product | null;
    onClose: () => void;
    onEdit: (product: Product) => void;
}

function Field({ icon: Icon, label, children }: {
    icon: React.ElementType;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-surface-muted p-1.5 shrink-0">
                <Icon className="h-3.5 w-3.5 text-foreground-muted" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs text-foreground-muted font-medium uppercase tracking-wide">{label}</span>
                <div className="text-sm text-foreground">{children}</div>
            </div>
        </div>
    );
}

export function ProductDetailModal({ product, onClose, onEdit }: ProductDetailModalProps) {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    if (!product) return null;

    // Mismo criterio que la tabla (T2-38): el nivel se nombra, no solo se tiñe.
    const nivel = product.isActive ? nivelDeStock(product.stock, product.minStock) : "correcto";

    const fmt = (dateStr: string) =>
        new Date(dateStr).toLocaleDateString("es-MX", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <Modal isOpen={!!product} onClose={onClose} title="Detalle del producto" className="max-w-lg">
            <div className="flex flex-col gap-5">

                {/* ── Encabezado ── */}
                <div className="flex items-start gap-4">
                    {product.imageUrl ? (
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-20 w-20 rounded-xl object-cover shrink-0 border border-border"
                        />
                    ) : (
                        <div className="h-20 w-20 rounded-xl bg-surface-muted flex flex-col items-center justify-center text-border text-xs shrink-0 gap-1">
                            <CubeIcon className="h-6 w-6" />
                            <span>Sin imagen</span>
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-foreground text-base leading-snug">{product.name}</h3>
                            <EstadoBadge
                                estado={product.isActive ? ACTIVIDAD.activo : ACTIVIDAD.inactivo}
                                className="shrink-0 mt-0.5"
                            />
                        </div>

                        {product.sku && (
                            <span className="mt-1 inline-block font-mono text-xs text-foreground-muted bg-surface-muted border border-border rounded px-1.5 py-0.5">
                                {product.sku}
                            </span>
                        )}

                        {product.description && (
                            <p className="mt-2 text-sm text-foreground-muted leading-relaxed line-clamp-3">
                                {product.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="border-t border-border" />

                {/* ── Campos ── */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field icon={CurrencyDollarIcon} label="Precio">
                        <span className="font-semibold text-foreground tabular-nums">
                            ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                    </Field>

                    <Field icon={CubeIcon} label="Stock actual">
                        <div className="flex items-center gap-1.5">
                            <span className={nivel === "correcto" ? "text-foreground" : "font-semibold text-foreground"}>
                                {product.stock}
                            </span>
                            {nivel !== "correcto" && <EstadoBadge estado={NIVEL_STOCK[nivel]} />}
                        </div>
                    </Field>

                    <Field icon={ExclamationTriangleIcon} label="Stock mínimo">
                        {product.minStock > 0 ? (
                            <span className="text-foreground">{product.minStock}</span>
                        ) : (
                            <span className="text-foreground-muted">Sin alerta</span>
                        )}
                    </Field>

                    <Field icon={TagIcon} label="Categoría">
                        {product.category ? (
                            <Badge variant="neutral">{product.category.name}</Badge>
                        ) : (
                            <span className="text-foreground-muted">—</span>
                        )}
                    </Field>

                    <Field icon={TagIcon} label="Marca">
                        {product.brand ? (
                            <span className="text-foreground">{product.brand.name}</span>
                        ) : (
                            <span className="text-foreground-muted">—</span>
                        )}
                    </Field>

                    <Field icon={TruckIcon} label="Proveedor">
                        {product.supplier ? (
                            <span className="text-foreground">{product.supplier.name}</span>
                        ) : (
                            <span className="text-foreground-muted">—</span>
                        )}
                    </Field>

                    <Field icon={CalendarDaysIcon} label="Creado">
                        <span className="text-foreground-muted text-xs">{fmt(product.createdAt)}</span>
                    </Field>

                    <Field icon={CalendarDaysIcon} label="Última actualización">
                        <span className="text-foreground-muted text-xs">{fmt(product.updatedAt)}</span>
                    </Field>
                </div>

                {/* ── Acciones ── */}
                <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Link
                        to={`/catalog/products/${product.id}/movements`}
                        className="flex-1"
                        onClick={onClose}
                    >
                        <Button variant="secondary" type="button" className="w-full">
                            <ChartBarIcon className="h-4 w-4" />
                            Ver movimientos
                        </Button>
                    </Link>

                    {isAdmin && product.isActive && (
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={() => { onClose(); onEdit(product); }}
                        >
                            <PencilIcon className="h-4 w-4" />
                            Editar producto
                        </Button>
                    )}
                </div>

            </div>
        </Modal>
    );
}
