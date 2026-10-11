// T4-01 — la forma de todo lo que **llega** la define el contrato
// (`Stockly-B/src/contratos/api.ts`, copiado en `@/shared/contratos`). Aquí solo quedan
// los nombres que usa la aplicación y los DTO de lo que **se envía**, que son otra cosa:
// los valida el backend con sus `*.validator.ts` y no viajan en la respuesta.
//
// Lo que cambió al conectar el contrato: `price` era `number` y llega como cadena, y
// `description`/`imageUrl` eran `string | undefined` y llegan como `string | null`.
import type {
    ClaseAbc,
    HistorialCosteDeProducto,
    HistorialPrecio,
    LoteDeProducto,
    LotesDeProducto,
    MovimientoStock,
    ProductoConDisponible,
    MovimientosDeProducto,
    Producto,
    ProductoExportado,
    ResultadoImportacion,
    TipoMovimiento,
} from "@/shared/contratos";

export type Product = Producto;
/**
 * T5-03 — lo que devuelven `GET /products` y `GET /products/:id`: el producto con lo
 * comprometido en ventas pendientes y el disponible. El resto de respuestas no lo traen, y por
 * eso es un tipo aparte y no un campo opcional de `Product`: así no se puede leer donde no está.
 */
export type ProductWithAvailability = ProductoConDisponible;
export type StockMovementType = TipoMovimiento;
export type StockMovement = MovimientoStock;
export type PriceHistoryEntry = HistorialPrecio;
/** T5-01 — paginado y del más reciente al más antiguo, como los movimientos. */
export type CostHistoryResponse = HistorialCosteDeProducto;
export type ExportedProduct = ProductoExportado;
export type ImportResult = ResultadoImportacion;

/**
 * T4-15 — ya no es `{ product, movements }`: trae también `meta`, porque el histórico
 * llega paginado. Se toma del contrato en vez de repetirse aquí; así, si el backend
 * cambia la forma, esto deja de compilar en lugar de fallar en ejecución.
 */
export type MovementsResponse = MovimientosDeProducto;

/** T5-15 — los lotes con existencias de un producto, en el orden en que salen. */
export type ProductLots = LotesDeProducto;
export type ProductLot = LoteDeProducto;

/** T5-08 — lo que hace falta de un producto para etiquetarlo. */
export type ProductoEtiquetable = Pick<Product, "id" | "name" | "sku" | "barcode">;

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
    /** T5-14 — solo los de ese almacén. */
    warehouseId?: string;
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
    barcode?: string;
    price: number;
    costPrice?: number;
    stock?: number;
    minStock?: number;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    tagIds?: string[];
    image?: File;
    /** T5-14 — el almacén en el que entra el stock inicial; sin él, el predeterminado. */
    warehouseId?: string;
    /** T5-15 — si sus entradas piden lote y, entonces, el del stock inicial. */
    tracksLots?: boolean;
    lotExpiresAt?: string;
    lotCode?: string;
}

export interface UpdateProductDto {
    name?: string;
    description?: string;
    sku?: string;
    /** T5-08 — la cadena vacía lo quita, como `costPrice`. */
    barcode?: string;
    price?: number;
    /**
     * T5-01 — la cadena vacía **quita** el coste: viaja por `multipart/form-data`, donde no
     * hay `null`, y el backend la lee como «desconocido». Ausente significa «no tocarlo».
     */
    costPrice?: number | "";
    stock?: number;
    minStock?: number;
    categoryId?: string;
    brandId?: string;
    supplierId?: string;
    tagIds?: string[];
    image?: File;
    removeImage?: boolean;
    /** T5-15 — marcarlo o desmarcarlo. Viaja siempre: `false` es desmarcarlo. */
    tracksLots?: boolean;
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
    /** T5-10 — C incluye los productos sin ventas en el periodo; el filtro lo resuelve el servidor. */
    abcClass?: ClaseAbc;
    /** T5-14 — solo los productos con existencias en ese almacén. */
    warehouseId?: string;
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
    /** T5-14 — en qué almacén; sin él, en el predeterminado. */
    warehouseId?: string;
    /** T5-15 — el lote: uno que existe, o —en una entrada— su caducidad (`AAAA-MM-DD`) y su código. */
    lotId?: string;
    expiresAt?: string;
    lotCode?: string;
}

export interface BulkStockItem {
    productId: string;
    stock: number;
}

export interface BulkStockDto {
    items: BulkStockItem[];
    reason?: string;
    /** T5-14 — el almacén cuyas existencias se fijan; sin él, el predeterminado. */
    warehouseId?: string;
}
