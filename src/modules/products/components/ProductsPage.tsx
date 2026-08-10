import { useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { ProductTable } from "@/modules/products/components/ProductTable";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ManualMovementModal } from "@/modules/products/components/ManualMovementModal";
import { BulkStockModal } from "@/modules/products/components/BulkStockModal";
import { Button } from "@/shared/components/Button";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useImportProducts } from "@/modules/products/hooks/useImportProducts";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { exportProducts } from "@/modules/products/api/product.api";
import { toCsv, downloadBlob, blobCsv, parseCsv } from "@/modules/products/utils/importExport";
import type { Product, ImportProductDto } from "@/modules/products/types/product.types";
import {
    PlusIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    AdjustmentsHorizontalIcon,
    BoltIcon,
} from "@heroicons/react/24/outline";

interface Filters {
    search?: string;
    categoryId?: string;
    tagId?: string;
    isActive?: boolean;
}

export default function ProductsPage() {
    const [filters, setFilters] = useState<Filters>({ isActive: true });
    const [page, setPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>();
    const [isExporting, setIsExporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [movementProduct, setMovementProduct] = useState<Product | undefined>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importFormatRef = useRef<"json" | "csv">("json");

    const { data, isLoading } = useProducts({ ...filters, page, limit: 10 });
    const importMutation = useImportProducts();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const handleFilterChange = useCallback((newFilters: Filters) => {
        setFilters(newFilters);
        setPage(1);
        setSelectedIds(new Set());
    }, []);

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingProduct(undefined);
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
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
                downloadBlob(blobCsv(toCsv(products)), `${filename}.csv`);
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
    const allProducts = data?.data ?? [];

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Productos</h1>
                    <p className="text-sm text-foreground-muted mt-1">{data?.meta.total ?? 0} productos en total</p>
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

            {/* Barra de acciones masivas */}
            {isAdmin && selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-info-surface rounded-xl border border-info">
                    <span className="text-sm font-medium text-info">
                        {selectedIds.size} producto{selectedIds.size !== 1 ? "s" : ""} seleccionado{selectedIds.size !== 1 ? "s" : ""}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button
                            variant="secondary"
                            onClick={() => setIsBulkModalOpen(true)}
                        >
                            <AdjustmentsHorizontalIcon className="h-4 w-4" />
                            Ajuste masivo de stock
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            Deseleccionar
                        </Button>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                aria-label="Seleccionar archivo de importación"
            />

            <ProductFilters onFilterChange={handleFilterChange} />

            <ProductTable
                products={allProducts}
                isLoading={isLoading}
                onEdit={handleEdit}
                selectedIds={isAdmin ? selectedIds : undefined}
                onToggleSelect={isAdmin ? handleToggleSelect : undefined}
            />

            {/* Botón movimiento rápido para producto individual (visible en hover via contexto) */}
            {movementProduct && (
                <ManualMovementModal
                    isOpen={!!movementProduct}
                    onClose={() => setMovementProduct(undefined)}
                    product={movementProduct}
                />
            )}

            {/* Acceso rápido: botón flotante de movimiento manual para el primero seleccionado */}
            {isAdmin && selectedIds.size === 1 && (
                <div className="fixed bottom-6 right-6 z-50">
                    <Button
                        onClick={() => {
                            const id = [...selectedIds][0];
                            const product = allProducts.find((p) => p.id === id);
                            if (product) setMovementProduct(product);
                        }}
                        // T3-14: flota por encima del contenido, así que le toca la
                        // elevación de superposición, la misma que modales y desplegables.
                        className="shadow-overlay"
                    >
                        <BoltIcon className="h-4 w-4" />
                        Movimiento manual
                    </Button>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
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

            <BulkStockModal
                isOpen={isBulkModalOpen}
                onClose={() => { setIsBulkModalOpen(false); setSelectedIds(new Set()); }}
                products={allProducts}
                selectedIds={selectedIds}
            />
        </div>
    );
}
