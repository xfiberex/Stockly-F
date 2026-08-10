import api from "@/shared/api/axios";
import { blobCsv, downloadBlob } from "@/modules/products/utils/importExport";
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
        if (key === "tagIds") {
            const ids = value as string[];
            // Una lista vacía debe viajar igualmente: si la clave no aparece, el
            // backend entiende «no tocar las etiquetas» y nunca podrían quitarse
            // todas. La cadena vacía es el «ninguna» explícito que espera el
            // validador (`product.validator.ts:tagIdsOptional`).
            if (ids.length === 0) form.append("tagIds", "");
            else ids.forEach((id) => form.append("tagIds", id));
            return;
        }
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

/**
 * T2-34 — descarga por axios, no por un `<a href>` a otro origen.
 *
 * La versión anterior apuntaba el enlace directamente al backend, y eso rompía tres
 * cosas a la vez: el atributo `download` se ignora entre orígenes distintos, así que el
 * nombre del archivo lo decidía el servidor; la petición no pasaba por el interceptor de
 * axios, de modo que **con la sesión caducada el usuario se descargaba el JSON del error
 * 401** creyendo que era su CSV, sin redirección al login; y el archivo llegaba sin la
 * marca de orden de bytes, con los acentos rotos al abrirlo en Excel.
 *
 * Pidiéndolo como `blob` por axios, el interceptor vuelve a ver la respuesta y el archivo
 * se construye aquí, con `blobCsv`, que es el mismo camino que las otras dos descargas.
 */
export const exportProductMovementsCsv = async (productId: string): Promise<void> => {
    const { data } = await api.get<string>(`/products/${productId}/movements/export`, {
        params: { format: "csv" },
        responseType: "text",
    });
    const fecha = new Date().toISOString().split("T")[0];
    downloadBlob(blobCsv(data), `stockly-movimientos-${productId.slice(0, 8)}-${fecha}.csv`);
};
