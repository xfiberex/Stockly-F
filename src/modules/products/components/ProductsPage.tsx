import { useState, useCallback, useRef } from "react";
import { toast } from "react-toastify";
import { ProductFilters } from "@/modules/products/components/ProductFilters";
import { ProductTable } from "@/modules/products/components/ProductTable";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { ManualMovementModal } from "@/modules/products/components/ManualMovementModal";
import { BulkStockModal } from "@/modules/products/components/BulkStockModal";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import { EtiquetasModal } from "@/modules/products/components/EtiquetasModal";
import { EscanerModal } from "@/shared/components/EscanerModal";
import { Modal } from "@/shared/components/Modal";
import { useBuscarPorCodigo } from "@/modules/products/hooks/useBuscarPorCodigo";
import { Button } from "@/shared/components/Button";
import { cn } from "@/shared/lib/cn";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { useProducts } from "@/modules/products/hooks/useProducts";
import { useImportProducts } from "@/modules/products/hooks/useImportProducts";
import { useAbcSummary } from "@/modules/reports/hooks/useReports";
import { formatearDia } from "@/shared/lib/fechas";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { exportProducts } from "@/modules/products/api/product.api";
import { toCsv, downloadBlob, blobCsv, parseCsv } from "@/modules/products/utils/importExport";
import { useT } from "@/shared/hooks/useIdioma";
import type { Product, ProductWithAvailability, ProductoEtiquetable, ImportProductDto } from "@/modules/products/types/product.types";
import {
    PlusIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    AdjustmentsHorizontalIcon,
    BoltIcon,
    PrinterIcon,
    ViewfinderCircleIcon,
} from "@heroicons/react/24/outline";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";

interface Filters {
    search?: string;
    categoryId?: string;
    tagId?: string;
    isActive?: boolean;
}

export default function ProductsPage() {
    const { t, tn, te, idioma } = useT();
    const [filters, setFilters] = useState<Filters>({ isActive: true });
    const [page, setPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | undefined>();
    const [isExporting, setIsExporting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [movementProduct, setMovementProduct] = useState<Product | undefined>();
    // T5-08 — escanear, lo que salió del escaneo, y las etiquetas.
    const [escaneando, setEscaneando] = useState(false);
    const [escaneado, setEscaneado] = useState<ProductWithAvailability | null>(null);
    const [codigoDesconocido, setCodigoDesconocido] = useState<string | null>(null);
    const [codigoNuevo, setCodigoNuevo] = useState<string | undefined>();
    const [etiquetasDe, setEtiquetasDe] = useState<ProductoEtiquetable[] | null>(null);
    // Lo seleccionado puede venir de otras páginas, y la tabla solo tiene la actual: para
    // etiquetar hace falta saber de cada uno si tiene código, así que se guarda al marcarlo.
    const [vistos, setVistos] = useState<Map<string, Product>>(() => new Map());
    const { buscar, buscando } = useBuscarPorCodigo();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importFormatRef = useRef<"json" | "csv">("json");

    const { data, isLoading } = useProducts({ ...filters, page, limit: 10 });
    const importMutation = useImportProducts();
    const { data: resumenAbc } = useAbcSummary();
    // T5-13 — seleccionar sirve para mover stock (ajuste en bloque o movimiento manual), y eso
    // también lo hace el almacén; crear e importar fijan precios y siguen siendo de ADMIN.
    const puede = usePuede();
    const puedeCrear = puede("POST /products");
    const puedeAjustarEnBloque = puede("PATCH /products/bulk-stock");
    const puedeMover = puede("POST /products/:id/movements");
    const puedeSeleccionar = puedeAjustarEnBloque || puedeMover;

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
        setCodigoNuevo(undefined);
    };

    /**
     * T5-08 — un código que existe abre su ficha; uno que no, pregunta si darlo de alta con el
     * código ya puesto. La ficha es la misma que abre la tabla, con sus mismas acciones.
     */
    const handleCodigo = async (codigo: string) => {
        setEscaneando(false);
        const producto = await buscar(codigo);
        if (producto) setEscaneado(producto);
        else if (producto === null) setCodigoDesconocido(codigo);
    };

    const darDeAlta = () => {
        setCodigoNuevo(codigoDesconocido ?? undefined);
        setCodigoDesconocido(null);
        setIsFormOpen(true);
    };

    const handleToggleSelect = (id: string) => {
        const producto = allProducts.find((p) => p.id === id);
        if (producto) setVistos((prev) => new Map(prev).set(id, producto));
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
    const flotanteVisible = puedeMover && selectedIds.size === 1;

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, flotanteVisible && "pb-28")}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.productos")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{tn("productos.total", data?.meta.total ?? 0)}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    <Button variant="secondary" onClick={() => setEscaneando(true)} isLoading={buscando}>
                        <ViewfinderCircleIcon className="h-4 w-4" />
                        {t("escaner.escanear")}
                    </Button>
                    <DropdownButton
                        label={t("productos.exportar")}
                        icon={ArrowDownTrayIcon}
                        disabled={isExporting}
                        items={[
                            { label: t("productos.exportarJson"), onClick: () => handleExport("json") },
                            { label: t("productos.exportarCsv"), onClick: () => handleExport("csv") },
                        ]}
                    />
                    {puedeCrear && (
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
            {puedeSeleccionar && selectedIds.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 bg-info-surface rounded-xl border border-info">
                    {/* El plural sale de `tn()`: el apaño de sumar «s» a dos palabras no
                        sobrevive a un idioma donde la marca de plural va en otro sitio. */}
                    <span className="text-sm font-medium text-info">
                        {tn("productos.seleccionados", selectedIds.size)}
                    </span>
                    <div className="flex gap-2 ml-auto">
                        {puedeAjustarEnBloque && (
                            <Button
                                variant="secondary"
                                onClick={() => setIsBulkModalOpen(true)}
                            >
                                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                                {t("productos.ajusteMasivo")}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => setEtiquetasDe([...selectedIds].flatMap((id) => vistos.get(id) ?? []))}
                        >
                            <PrinterIcon className="h-4 w-4" />
                            {t("etiquetas.imprimir")}
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

            {/* T5-10 — de dónde sale la columna ABC. Sin esto, una C en un producto que se
                vende a diario parecería un error: es C si este mes aún no cuenta. */}
            {resumenAbc && (
                <p className="text-xs text-foreground-muted">
                    {t("productos.abc.leyenda", {
                        desde: formatearDia(idioma, resumenAbc.from),
                        hasta: formatearDia(idioma, resumenAbc.to),
                    })}
                </p>
            )}

            <ProductTable
                products={allProducts}
                isLoading={isLoading}
                onEdit={handleEdit}
                selectedIds={puedeSeleccionar ? selectedIds : undefined}
                onToggleSelect={puedeSeleccionar ? handleToggleSelect : undefined}
                onPrintLabels={(p) => setEtiquetasDe([p])}
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
                key={editingProduct?.id ?? `new-${codigoNuevo ?? ""}`}
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                product={editingProduct}
                codigoInicial={codigoNuevo}
            />

            <EscanerModal isOpen={escaneando} onClose={() => setEscaneando(false)} onCodigo={handleCodigo} />

            <ProductDetailModal
                product={escaneado}
                onClose={() => setEscaneado(null)}
                onEdit={(p) => { setEscaneado(null); handleEdit(p); }}
                onPrintLabels={(p) => setEtiquetasDe([p])}
            />

            <Modal
                isOpen={codigoDesconocido !== null}
                onClose={() => setCodigoDesconocido(null)}
                title={t("escaner.desconocidoTitulo")}
                className="max-w-md"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-foreground">
                        {t("escaner.desconocido", { codigo: codigoDesconocido ?? "" })}
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" onClick={() => { setCodigoDesconocido(null); setEscaneando(true); }}>
                            {t("escaner.otraVez")}
                        </Button>
                        {puedeCrear && (
                            <Button onClick={darDeAlta}>
                                <PlusIcon className="h-4 w-4" />
                                {t("escaner.darDeAlta")}
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {etiquetasDe && (
                <EtiquetasModal isOpen onClose={() => setEtiquetasDe(null)} productos={etiquetasDe} />
            )}

            <BulkStockModal
                isOpen={isBulkModalOpen}
                onClose={() => { setIsBulkModalOpen(false); setSelectedIds(new Set()); }}
                products={allProducts}
                selectedIds={selectedIds}
            />
        </div>
    );
}
