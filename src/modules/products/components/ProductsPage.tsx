import { useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { ProductTable } from "@/modules/products/components/ProductTable";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { Button } from "@/shared/components/Button";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useImportProducts } from "@/modules/products/hooks/useImportProducts";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { exportProducts } from "@/modules/products/api/product.api";
import { toCsv, downloadBlob, parseCsv } from "@/modules/products/utils/importExport";
import type { Product, ImportProductDto } from "@/modules/products/types/product.types";
import {
    PlusIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

interface Filters {
    search?: string;
    categoryId?: string;
    isActive?: boolean;
}

export default function ProductsPage() {
    const [filters, setFilters] = useState<Filters>({ isActive: true });
    const [page, setPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>();
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importFormatRef = useRef<"json" | "csv">("json");

    const { data, isLoading } = useProducts({ ...filters, page, limit: 10 });
    const importMutation = useImportProducts();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const handleFilterChange = useCallback((newFilters: Filters) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingProduct(undefined);
    };

    const handleExport = async (format: "json" | "csv") => {
        setIsExporting(true);
        try {
            const products = await exportProducts();
            const date = new Date().toISOString().split("T")[0];
            const filename = `stockly-productos-${date}`;

            if (format === "json") {
                const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
                downloadBlob(blob, `${filename}.json`);
            } else {
                const blob = new Blob([toCsv(products)], { type: "text/csv;charset=utf-8;" });
                downloadBlob(blob, `${filename}.csv`);
            }

            toast.success(`${products.length} productos exportados como ${format.toUpperCase()}`);
        } catch {
            toast.error("Error al exportar productos");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = (format: "json" | "csv") => {
        importFormatRef.current = format;
        if (fileInputRef.current) {
            fileInputRef.current.accept = format === "json" ? ".json" : ".csv";
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            let products: ImportProductDto[];

            if (importFormatRef.current === "json") {
                const parsed = JSON.parse(text);
                products = Array.isArray(parsed) ? parsed : parsed.products ?? [];
            } else {
                products = parseCsv(text);
            }

            if (products.length === 0) {
                toast.warning("El archivo no contiene productos");
                return;
            }

            importMutation.mutate(products);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Archivo inválido";
            toast.error(`Error al leer el archivo: ${msg}`);
        }
    };

    const totalPages = data?.meta.totalPages ?? 1;

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
                    <p className="text-sm text-gray-500 mt-1">{data?.meta.total ?? 0} productos en total</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <DropdownButton
                        label="Exportar"
                        icon={ArrowDownTrayIcon}
                        disabled={isExporting}
                        items={[
                            { label: "Exportar JSON", onClick: () => handleExport("json") },
                            { label: "Exportar CSV", onClick: () => handleExport("csv") },
                        ]}
                    />
                    {isAdmin && (
                        <>
                            <DropdownButton
                                label="Importar"
                                icon={ArrowUpTrayIcon}
                                disabled={importMutation.isPending}
                                items={[
                                    { label: "Importar JSON", onClick: () => handleImportClick("json") },
                                    { label: "Importar CSV", onClick: () => handleImportClick("csv") },
                                ]}
                            />
                            <Button onClick={() => setIsFormOpen(true)}>
                                <PlusIcon className="h-4 w-4" />
                                Nuevo producto
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Input oculto para selección de archivo */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Seleccionar archivo de importación"
            />

            <ProductFilters onFilterChange={handleFilterChange} />

            <ProductTable products={data?.data ?? []} isLoading={isLoading} onEdit={handleEdit} />

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Página {page} de {totalPages}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            Anterior
                        </Button>
                        <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}

            <ProductForm
                key={editingProduct?.id ?? "new"}
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                product={editingProduct}
            />
        </div>
    );
}
