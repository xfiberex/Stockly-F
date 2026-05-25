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
