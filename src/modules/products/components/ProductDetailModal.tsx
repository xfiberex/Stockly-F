import { Link } from "react-router-dom";
import { Modal } from "@/shared/components/Modal";
import { Badge } from "@/shared/components/Badge";
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
            <div className="mt-0.5 rounded-md bg-gray-100 p-1.5 shrink-0">
                <Icon className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
                <div className="text-sm text-gray-900">{children}</div>
            </div>
        </div>
    );
}

export function ProductDetailModal({ product, onClose, onEdit }: ProductDetailModalProps) {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    if (!product) return null;

    const isLowStock = product.stock <= (product.minStock ?? 0) && product.isActive;
    const isOutOfStock = product.stock === 0;

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
                            className="h-20 w-20 rounded-xl object-cover shrink-0 border border-gray-200"
                        />
                    ) : (
                        <div className="h-20 w-20 rounded-xl bg-gray-100 flex flex-col items-center justify-center text-gray-300 text-xs shrink-0 gap-1">
                            <CubeIcon className="h-6 w-6" />
                            <span>Sin imagen</span>
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 text-base leading-snug">{product.name}</h3>
                            <Badge
                                variant={product.isActive ? "success" : "danger"}
                                className="shrink-0 mt-0.5"
                            >
                                {product.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                        </div>

                        {product.sku && (
                            <span className="mt-1 inline-block font-mono text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                {product.sku}
                            </span>
                        )}

                        {product.description && (
                            <p className="mt-2 text-sm text-gray-500 leading-relaxed line-clamp-3">
                                {product.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* ── Campos ── */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field icon={CurrencyDollarIcon} label="Precio">
                        <span className="font-semibold text-gray-900">
                            ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                        </span>
                    </Field>

                    <Field icon={CubeIcon} label="Stock actual">
                        <div className="flex items-center gap-1.5">
                            <span className={isLowStock ? "font-semibold text-orange-600" : "text-gray-900"}>
                                {product.stock}
                            </span>
                            {isOutOfStock && (
                                <Badge variant="danger">Agotado</Badge>
                            )}
                            {isLowStock && !isOutOfStock && (
                                <ExclamationTriangleIcon className="h-3.5 w-3.5 text-orange-500" />
                            )}
                        </div>
                    </Field>

                    <Field icon={ExclamationTriangleIcon} label="Stock mínimo">
                        {product.minStock > 0 ? (
                            <span className="text-gray-900">{product.minStock}</span>
                        ) : (
                            <span className="text-gray-400">Sin alerta</span>
                        )}
                    </Field>

                    <Field icon={TagIcon} label="Categoría">
                        {product.category ? (
                            <Badge variant="blue">{product.category.name}</Badge>
                        ) : (
                            <span className="text-gray-400">—</span>
                        )}
                    </Field>

                    <Field icon={TagIcon} label="Marca">
                        {product.brand ? (
                            <span className="text-gray-900">{product.brand.name}</span>
                        ) : (
                            <span className="text-gray-400">—</span>
                        )}
                    </Field>

                    <Field icon={TruckIcon} label="Proveedor">
                        {product.supplier ? (
                            <span className="text-gray-900">{product.supplier.name}</span>
                        ) : (
                            <span className="text-gray-400">—</span>
                        )}
                    </Field>

                    <Field icon={CalendarDaysIcon} label="Creado">
                        <span className="text-gray-600 text-xs">{fmt(product.createdAt)}</span>
                    </Field>

                    <Field icon={CalendarDaysIcon} label="Última actualización">
                        <span className="text-gray-600 text-xs">{fmt(product.updatedAt)}</span>
                    </Field>
                </div>

                {/* ── Acciones ── */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
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
