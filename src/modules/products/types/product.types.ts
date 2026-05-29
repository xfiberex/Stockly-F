export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    imageUrl?: string;
    imagePublicId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductDto {
    name: string;
    description?: string;
    price: number;
    stock?: number;
    category: string;
    image?: File;
}

export interface UpdateProductDto {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    category?: string;
    image?: File;
    removeImage?: boolean;
}

export interface ProductQuery {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
}

export interface ImportProductDto {
    name: string;
    description?: string;
    price: number | string;
    stock?: number | string;
    category: string;
    isActive?: boolean | string;
}

export interface ExportedProduct {
    name: string;
    description: string | null;
    price: number;
    stock: number;
    category: string;
    isActive: boolean;
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
