import { useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { ProductTable } from "@/modules/products/components/ProductTable";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ManualMovementModal } from "@/modules/products/components/ManualMovementModal";
import { BulkStockModal } from "@/modules/products/components/BulkStockModal";
import { Button } from "@/shared/components/Button";
import { cn } from "@/shared/lib/cn";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useImportProducts } from "@/modules/products/hooks/useImportProducts";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { exportProducts } from "@/modules/products/api/product.api";
import { toCsv, downloadBlob, blobCsv, parseCsv } from "@/modules/products/utils/importExport";
import { useT } from "@/shared/hooks/useIdioma";
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
    const { t, tn, te } = useT();
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

            toast.success(tn("productos.exportados", products.length, { formato: format.toUpperCase() }));
        } catch {
            toast.error(t("productos.errorExportar"));
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
                toast.warning(t("importacion.sinProductos"));
                return;
            }

            importMutation.mutate(products);
        } catch (err) {
            // `parseCsv` lanza la **clave** de su motivo (T4-04); un fallo del navegador
            // —un JSON mal formado— trae su propio texto, que `te()` deja pasar tal cual
            // porque no está en el catálogo.
            const motivo = (err instanceof Error ? te(err.message) : undefined) ?? t("importacion.archivoInvalido");
            toast.error(t("importacion.errorLeer", { motivo }));
        }
    };

    const totalPages = data?.meta.totalPages ?? 1;
    const allProducts = data?.data ?? [];

    // T3-09 — el botón flotante es `fixed`, así que no ocupa sitio en el flujo y se
    // planta encima de lo último que haya en la página: los controles de paginación,
    // que van alineados a la derecha igual que él. **Verificado en navegador antes de
    // arreglarlo, y no era solo cuestión de verse mal:** `elementFromPoint` en el centro
    // de «Anterior» y «Siguiente» devolvía el botón flotante, así que la pulsación no
    // llegaba. Ocurre a 375 px y también a 1280, porque lo que los junta no es el ancho
    // sino que ambos viven abajo a la derecha.
    //
    // El hueco reserva el alto del botón (44 px) más su separación del borde (24 px) y
    // un margen: al llegar al final del scroll, la paginación queda por encima de él.
    // Solo se añade cuando el botón existe, para no dejar un hueco muerto el resto del
    // tiempo — que es lo que pasaría con un `pb` fijo en el contenedor.
    const flotanteVisible = isAdmin && selectedIds.size === 1;

    return (
        <div className={cn("max-w-7xl mx-auto px-6 py-8 space-y-6", flotanteVisible && "pb-28")}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.productos")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{tn("productos.total", data?.meta.total ?? 0)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <DropdownButton
                        label={t("productos.exportar")}
                        icon={ArrowDownTrayIcon}
                        disabled={isExporting}
                        items={[
                            { label: t("productos.exportarJson"), onClick: () => handleExport("json") },
                            { label: t("productos.exportarCsv"), onClick: () => handleExport("csv") },
                        ]}
                    />
                    {isAdmin && (
                        <>
                            <DropdownButton
                                label={t("productos.importar")}
                                icon={ArrowUpTrayIcon}
                                disabled={importMutation.isPending}
                                items={[
                                    { label: t("productos.importarJson"), onClick: () => handleImportClick("json") },
                                    { label: t("productos.importarCsv"), onClick: () => handleImportClick("csv") },
                                ]}
                            />
                            <Button onClick={() => setIsFormOpen(true)}>
                                <PlusIcon className="h-4 w-4" />
                                {t("productos.nuevo")}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Barra de acciones masivas */}
            {isAdmin && selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-info-surface rounded-xl border border-info">
                    {/* El plural sale de `tn()`: el apaño de sumar «s» a dos palabras no
                        sobrevive a un idioma donde la marca de plural va en otro sitio. */}
                    <span className="text-sm font-medium text-info">
                        {tn("productos.seleccionados", selectedIds.size)}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        <Button
                            variant="secondary"
                            onClick={() => setIsBulkModalOpen(true)}
                        >
                            <AdjustmentsHorizontalIcon className="h-4 w-4" />
                            {t("productos.ajusteMasivo")}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => setSelectedIds(new Set())}
                        >
                            {t("productos.deseleccionar")}
                        </Button>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                aria-label={t("productos.seleccionarArchivo")}
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
            {flotanteVisible && (
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
                        {t("productos.movimientoManual")}
                    </Button>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{t("comun.paginaDeTotal", { pagina: page, total: totalPages })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            {t("comun.anterior")}
                        </Button>
                        <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                            {t("comun.siguiente")}
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
