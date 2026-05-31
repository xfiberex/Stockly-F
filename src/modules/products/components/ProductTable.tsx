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
            <div className="py-16 text-center text-sm text-gray-400">No se encontraron productos</div>
        );
    }

    const selectable = !!onToggleSelect;

    return (
        <>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-160 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
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
                <tbody className="divide-y divide-gray-100 bg-white">
                    {products.map((product) => {
                        const isLowStock = product.stock <= (product.minStock ?? 0) && product.isActive;
                        return (
                            <tr
                                key={product.id}
                                className={`hover:bg-gray-50 transition-colors ${isLowStock ? "bg-orange-50/40" : ""}`}
                            >
                                {selectable && (
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds?.has(product.id) ?? false}
                                            onChange={() => onToggleSelect!(product.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300">
                                            <CubeIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <Link
                                        to={`/catalog/products/${product.id}/movements`}
                                        className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                                    >
                                        {product.name}
                                    </Link>
                                    {product.sku && (
                                        <div className="text-xs text-gray-400 font-mono">{product.sku}</div>
                                    )}
                                    {product.description && !product.sku && (
                                        <div className="text-xs text-gray-400 truncate max-w-48">
                                            {product.description}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {product.category ? (
                                        <Badge variant="blue">{product.category.name}</Badge>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {product.brand ? (
                                        <span className="text-sm text-gray-700">{product.brand.name}</span>
                                    ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-gray-700 tabular-nums">
                                    ${Number(product.price).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className={isLowStock ? "text-orange-600 font-semibold" : "text-gray-700"}>
                                            {product.stock}
                                        </span>
                                        {isLowStock && (
                                            <ExclamationTriangleIcon
                                                className="h-4 w-4 text-orange-500"
                                                title={`Stock mínimo: ${product.minStock}`}
                                            />
                                        )}
                                        {product.minStock > 0 && (
                                            <span className="text-xs text-gray-400">/ {product.minStock}</span>
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
                                            <EyeIcon className="h-4 w-4 text-gray-500" />
                                        </Button>
                                        <Link to={`/catalog/products/${product.id}/movements`}>
                                            <Button variant="ghost" title="Historial de movimientos" type="button">
                                                <ChartBarIcon className="h-4 w-4 text-blue-500" />
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
                                                    <TrashIcon className="h-4 w-4 text-red-500" />
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
                                                <ArrowPathIcon className="h-4 w-4 text-green-600" />
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
