import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type {
    Product,
    CreateProductDto,
    UpdateProductDto,
    ProductQuery,
    ImportProductDto,
    ExportedProduct,
    ImportResult,
    MovementsResponse,
    PriceHistoryResponse,
    CreateManualMovementDto,
    BulkStockDto,
} from "../types/product.types";

const toFormData = (dto: CreateProductDto | UpdateProductDto): FormData => {
    const form = new FormData();
    Object.entries(dto).forEach(([key, value]) => {
        if (value === undefined) return;
        if (typeof value === "boolean" && !value) return;
        form.append(key, value instanceof File ? value : String(value));
    });
    return form;
};

export const getProducts = async (params?: ProductQuery) => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Product>>>("/products", { params });
    return data.data!;
};

export const getProduct = async (id: string) => {
    const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return data.data!;
};

export const createProduct = async (dto: CreateProductDto) => {
    const { data } = await api.post<ApiResponse<Product>>("/products", toFormData(dto), {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data!;
};

export const updateProduct = async ({ id, dto }: { id: string; dto: UpdateProductDto }) => {
    const { data } = await api.put<ApiResponse<Product>>(`/products/${id}`, toFormData(dto), {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data!;
};

export const deleteProduct = async (id: string) => {
    const { data } = await api.delete<ApiResponse<void>>(`/products/${id}`);
    return data;
};

export const restoreProduct = async (id: string) => {
    const { data } = await api.patch<ApiResponse<Product>>(`/products/${id}/restore`);
    return data;
};

export const exportProducts = async (): Promise<ExportedProduct[]> => {
    const { data } = await api.get<ApiResponse<ExportedProduct[]>>("/products/export");
    return data.data!;
};

export const importProducts = async (products: ImportProductDto[]): Promise<ImportResult> => {
    const { data } = await api.post<ApiResponse<ImportResult>>("/products/import", { products });
    return data.data!;
};

export const getProductMovements = async (productId: string): Promise<MovementsResponse> => {
    const { data } = await api.get<ApiResponse<MovementsResponse>>(`/products/${productId}/movements`);
    return data.data!;
};

export const getPriceHistory = async (productId: string): Promise<PriceHistoryResponse> => {
    const { data } = await api.get<ApiResponse<PriceHistoryResponse>>(`/products/${productId}/price-history`);
    return data.data!;
};

export const createManualMovement = async (productId: string, dto: CreateManualMovementDto): Promise<Product> => {
    const { data } = await api.post<ApiResponse<Product>>(`/products/${productId}/movements`, dto);
    return data.data!;
};

export const bulkUpdateStock = async (dto: BulkStockDto): Promise<Array<{ productId: string; success: boolean; error?: string }>> => {
    const { data } = await api.patch<ApiResponse<Array<{ productId: string; success: boolean; error?: string }>>>("/products/bulk-stock", dto);
    return data.data!;
};
