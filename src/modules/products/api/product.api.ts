import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type { Product, CreateProductDto, UpdateProductDto, ProductQuery } from "../types/product.types";

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
