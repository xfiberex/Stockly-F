import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import { useDeleteProduct } from "@/modules/products/hooks/useDeleteProduct";
import { useRestoreProduct } from "@/modules/products/hooks/useRestoreProduct";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { Product } from "@/modules/products/types/product.types";
import { PencilIcon, TrashIcon, ArrowPathIcon, ChartBarIcon, ExclamationTriangleIcon, EyeIcon, CubeIcon } from "@heroicons/react/24/outline";

interface ProductTableProps {
    products: Product[];
    isLoading: boolean;
    onEdit: (product: Product) => void;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
}

export function ProductTable({ products, isLoading, onEdit, selectedIds, onToggleSelect }: ProductTableProps) {
    const deleteMutation = useDeleteProduct();
    const restoreMutation = useRestoreProduct();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Spinner size="lg" />
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-foreground-muted">No se encontraron productos</div>
        );
    }

    const selectable = !!onToggleSelect;

    return (
        <>
        <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-160 text-sm">
                <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    <tr>
                        {selectable && <th className="px-3 py-3 w-8" />}
                        <th className="px-4 py-3">Imagen</th>
                        <th className="px-4 py-3">Nombre / SKU</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Marca</th>
                        <th className="px-4 py-3">Precio</th>
                        <th className="px-4 py-3">Stock / Mín</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                    {products.map((product) => {
                        const isLowStock = product.stock <= (product.minStock ?? 0) && product.isActive;
                        return (
                            <tr
                                key={product.id}
                                className={`hover:bg-surface-muted transition-colors ${isLowStock ? "bg-warning-surface/40" : ""}`}
                            >
                                {selectable && (
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds?.has(product.id) ?? false}
                                            onChange={() => onToggleSelect!(product.id)}
                                            className="h-4 w-4 rounded border-border text-info focus:ring-accent"
                                        />
                                    </td>
                                )}
                                <td className="px-4 py-3">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="h-10 w-10 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center text-border">
                                            <CubeIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <Link
                                        to={`/catalog/products/${product.id}/movements`}
                                        className="font-medium text-foreground hover:text-info transition-colors"
                                    >
                                        {product.name}
                                    </Link>
                                    {product.sku && (
                                        <div className="text-xs text-foreground-muted font-mono">{product.sku}</div>
                                    )}
                                    {product.description && !product.sku && (
                                        <div className="text-xs text-foreground-muted truncate max-w-48">
                                            {product.description}
                                        </div>
                                    )}
                                </td>
                                {/* La categoría clasifica, no informa de un estado: variante neutra. */}
                                <td className="px-4 py-3">
                                    {product.category ? (
                                        <Badge variant="neutral">{product.category.name}</Badge>
                                    ) : (
                                        <span className="text-xs text-foreground-muted">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {product.brand ? (
                                        <span className="text-sm text-foreground">{product.brand.name}</span>
                                    ) : (
                                        <span className="text-xs text-foreground-muted">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-foreground tabular-nums">
                                    ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className={isLowStock ? "text-warning font-semibold" : "text-foreground"}>
                                            {product.stock}
                                        </span>
                                        {isLowStock && (
                                            <ExclamationTriangleIcon
                                                className="h-4 w-4 text-warning"
                                                title={`Stock mínimo: ${product.minStock}`}
                                            />
                                        )}
                                        {product.minStock > 0 && (
                                            <span className="text-xs text-foreground-muted">/ {product.minStock}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={product.isActive ? "success" : "danger"}>
                                        {product.isActive ? "Activo" : "Inactivo"}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            title="Ver detalles"
                                            onClick={() => setDetailProduct(product)}
                                        >
                                            <EyeIcon className="h-4 w-4 text-foreground-muted" />
                                        </Button>
                                        <Link to={`/catalog/products/${product.id}/movements`}>
                                            <Button variant="ghost" title="Historial de movimientos" type="button">
                                                <ChartBarIcon className="h-4 w-4 text-info" />
                                            </Button>
                                        </Link>
                                        {isAdmin && product.isActive && (
                                            <>
                                                <Button variant="ghost" onClick={() => onEdit(product)} title="Editar">
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    isLoading={deleteMutation.isPending}
                                                    onClick={() => deleteMutation.mutate(product.id)}
                                                    title="Eliminar"
                                                >
                                                    <TrashIcon className="h-4 w-4 text-danger" />
                                                </Button>
                                            </>
                                        )}
                                        {isAdmin && !product.isActive && (
                                            <Button
                                                variant="ghost"
                                                isLoading={restoreMutation.isPending}
                                                onClick={() => restoreMutation.mutate(product.id)}
                                                title="Restaurar"
                                            >
                                                <ArrowPathIcon className="h-4 w-4 text-success" />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <ProductDetailModal
            product={detailProduct}
            onClose={() => setDetailProduct(null)}
            onEdit={(p) => { setDetailProduct(null); onEdit(p); }}
        />
        </>
    );
}
