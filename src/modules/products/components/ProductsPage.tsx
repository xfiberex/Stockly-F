import { useState, useCallback } from "react";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { ProductTable } from "@/modules/products/components/ProductTable";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { Button } from "@/shared/components/Button";
import { useProducts } from "@/modules/products/hooks/useProducts";
import type { Product } from "@/modules/products/types/product.types";
import { PlusIcon } from "@heroicons/react/24/outline";

// Interface para los filtros de productos
interface Filters {
    search?: string;
    category?: string;
    isActive?: boolean;
}

// Página principal de productos que muestra la lista, filtros y formulario de creación/edición
export default function ProductsPage() {
    const [filters, setFilters] = useState<Filters>({ isActive: true });
    const [page, setPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>();

    // Obtiene los productos según los filtros y la paginación
    const { data, isLoading } = useProducts({ ...filters, page, limit: 10 });

    // Maneja el cambio de filtros, actualizando el estado y reseteando la página a 1
    const handleFilterChange = useCallback((newFilters: Filters) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    // Maneja la acción de editar un producto, abriendo el formulario con los datos del producto seleccionado
    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    // Maneja el cierre del formulario, reseteando el estado de edición
    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingProduct(undefined);
    };

    // Calcula el total de páginas a partir de los datos obtenidos
    const totalPages = data?.meta.totalPages ?? 1;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {data?.meta.total ?? 0} productos en total
                    </p>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    Nuevo producto
                </Button>
            </div>

            {/* Filtros */}
            <ProductFilters onFilterChange={handleFilterChange} />

            {/* Tabla */}
            <ProductTable
                products={data?.data ?? []}
                isLoading={isLoading}
                onEdit={handleEdit}
            />

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                        Página {page} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            disabled={page === 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="secondary"
                            disabled={page === totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}

            {/* Modal formulario */}
            <ProductForm
                key={editingProduct?.id ?? "new"}
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                product={editingProduct}
            />
        </div>
    );
}