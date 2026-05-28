import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useDeleteProduct } from "@/modules/products/hooks/useDeleteProduct";
import { useRestoreProduct } from "@/modules/products/hooks/useRestoreProduct";
import type { Product } from "@/modules/products/types/product.types";
import { PencilIcon, TrashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const CATEGORY_VARIANTS: Record<string, "blue" | "purple" | "teal" | "orange" | "default" | "success"> = {
    Electrónica: "blue",
    Periféricos: "purple",
    Audio: "teal",
    Accesorios: "orange",
    Muebles: "default",
    Otros: "default",
};

interface ProductTableProps {
    products: Product[];
    isLoading: boolean;
    onEdit: (product: Product) => void;
}

export function ProductTable({ products, isLoading, onEdit }: ProductTableProps) {
    const deleteMutation = useDeleteProduct();
    const restoreMutation = useRestoreProduct();

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

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                        <th className="px-4 py-3">Imagen</th>
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Precio</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                                {product.imageUrl ? (
                                    <img
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="h-10 w-10 rounded-lg object-cover"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
                                        N/A
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{product.name}</div>
                                {product.description && (
                                    <div className="text-xs text-gray-400 truncate max-w-48">
                                        {product.description}
                                    </div>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <Badge variant={CATEGORY_VARIANTS[product.category] ?? "default"}>
                                    {product.category}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                                ${Number(product.price).toFixed(2)}
                            </td>
                            <td className="px-4 py-3">
                                <span className={product.stock <= 3 ? "text-red-600 font-medium" : "text-gray-700"}>
                                    {product.stock}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <Badge variant={product.isActive ? "success" : "danger"}>
                                    {product.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                    {product.isActive ? (
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
                                    ) : (
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}
