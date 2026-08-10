export interface CategoryRef {
    id: string;
    name: string;
}

export interface BrandRef {
    id: string;
    name: string;
}

export interface SupplierRef {
    id: string;
    name: string;
}

export interface TagRef {
    id: string;
    name: string;
    color: string | null;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    sku?: string | null;
    price: number;
    stock: number;
    minStock: number;
    category: CategoryRef | null;
    brand: BrandRef | null;
    supplier: SupplierRef | null;
    tags: TagRef[];
    imageUrl?: string;
    imagePublicId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

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

export interface ImportProductDto {
    name: string;
    description?: string;
    price: number | string;
    stock?: number | string;
    categoryName?: string;
    brandName?: string;
    isActive?: boolean | string;
}

/**
 * T3-05 — la forma exacta de `filaDeExportacion` en `Stockly-B/src/modules/products/
 * product.service.ts`, que es lo que devuelve `GET /products/export`.
 *
 * `sku`, `minStock` y `tags` faltaban aquí: el backend ya los enviaba y este lado los
 * declaraba fuera, así que se descartaban al construir el CSV. `price` llega como cadena
 * porque es `Decimal` en Prisma, y `tags` como los nombres unidos por `;`.
 */
export interface ExportedProduct {
    name: string;
    description: string | null;
    sku: string | null;
    price: number | string;
    stock: number;
    minStock: number;
    isActive: boolean;
    categoryName: string | null;
    brandName: string | null;
    supplierName: string | null;
    tags: string;
}

export interface ImportResult {
    created: number;
    errors: Array<{ row: number; error: string }>;
}

export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT" | "IMPORT";

export interface StockMovement {
    id: string;
    productId: string;
    type: StockMovementType;
    delta: number;
    stockAfter: number;
    note?: string | null;
    createdAt: string;
}

export interface MovementsResponse {
    product: Product;
    movements: StockMovement[];
}

export interface PriceHistoryEntry {
    id: string;
    productId: string;
    oldPrice: number;
    newPrice: number;
    createdAt: string;
}

export interface PriceHistoryResponse {
    product: Product;
    history: PriceHistoryEntry[];
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
