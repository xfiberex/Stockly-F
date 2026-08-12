// T4-01 — la forma de todo lo que **llega** la define el contrato
// (`Stockly-B/src/contratos/api.ts`, copiado en `@/shared/contratos`). Aquí solo quedan
// los nombres que usa la aplicación y los DTO de lo que **se envía**, que son otra cosa:
// los valida el backend con sus `*.validator.ts` y no viajan en la respuesta.
//
// Lo que cambió al conectar el contrato: `price` era `number` y llega como cadena, y
// `description`/`imageUrl` eran `string | undefined` y llegan como `string | null`.
import type {
    EtiquetaRef,
    HistorialPrecio,
    MovimientoStock,
    MovimientosDeProducto,
    Producto,
    ProductoExportado,
    Referencia,
    ResultadoImportacion,
    TipoMovimiento,
} from "@/shared/contratos";

export type CategoryRef = Referencia;
export type BrandRef = Referencia;
export type SupplierRef = Referencia;
export type TagRef = EtiquetaRef;

export type Product = Producto;
export type StockMovementType = TipoMovimiento;
export type StockMovement = MovimientoStock;
export type PriceHistoryEntry = HistorialPrecio;
export type ExportedProduct = ProductoExportado;
export type ImportResult = ResultadoImportacion;

/**
 * T4-15 — ya no es `{ product, movements }`: trae también `meta`, porque el histórico
 * llega paginado. Se toma del contrato en vez de repetirse aquí; así, si el backend
 * cambia la forma, esto deja de compilar en lugar de fallar en ejecución.
 */
export type MovementsResponse = MovimientosDeProducto;

/**
 * Los filtros del histórico **viajan al servidor**. Filtrarlos en el navegador filtraría
 * solo la página traída: el resultado dependería de en qué página estás, sin avisar.
 */
export interface MovementsQuery {
    page?: number;
    limit?: number;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface PriceHistoryResponse {
    product: Product;
    history: PriceHistoryEntry[];
}

// ─────────────────────── Lo que se envía ───────────────────────

export interface CreateProductDto {
    name: string;
    description?: string;
    sku?: string;
    price: number;
    stock?: number;
    minStock?: number;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    tagIds?: string[];
    image?: File;
}

export interface UpdateProductDto {
    name?: string;
    description?: string;
    sku?: string;
    price?: number;
    stock?: number;
    minStock?: number;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    tagIds?: string[];
    image?: File;
    removeImage?: boolean;
}

export interface ProductQuery {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    tagId?: string;
    isActive?: boolean;
}

/** Fila de un CSV/JSON de importación: todo puede llegar como cadena sin convertir. */
export interface ImportProductDto {
    name: string;
    description?: string;
    price: number | string;
    stock?: number | string;
    categoryName?: string;
    brandName?: string;
    isActive?: boolean | string;
}

export interface CreateManualMovementDto {
    type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    reason: string;
    note?: string;
}

export interface BulkStockItem {
    productId: string;
    stock: number;
}

export interface BulkStockDto {
    items: BulkStockItem[];
    reason?: string;
}
