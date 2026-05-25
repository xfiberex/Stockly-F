import { api } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type {Product, CreateProductDto, UpdateProductDto, ProductQuery } from "../types/product.types";

// Función auxiliar para convertir DTOs a FormData, especialmente útil para manejar archivos
const toFormData = (dto: CreateProductDto | UpdateProductDto): FormData => {
  const form = new FormData();
  Object.entries(dto).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === "boolean" && !value) return;
    form.append(key, value instanceof File ? value : String(value));
  });
  return form;
};


// Funciones API para productos
export const getProducts = async (params?: ProductQuery) => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<Product>>>(
        "/products",
        { params },
    );
    return data.data!;
};

// Función para obtener un producto por ID
export const getProduct = async (id: string) => {
    const { data } = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return data.data!;
};

// Función para crear un nuevo producto
export const createProduct = async (dto: CreateProductDto) => {
    const { data } = await api.post<ApiResponse<Product>>(
        "/products",
        toFormData(dto),
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data!;
};

// Función para actualizar un producto existente
export const updateProduct = async ({
    id,
    dto,
}: {
    id: string;
    dto: UpdateProductDto;
}) => {
    const { data } = await api.put<ApiResponse<Product>>(
        `/products/${id}`,
        toFormData(dto),
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data.data!;
};

// Función para eliminar un producto (soft delete)
export const deleteProduct = async (id: string) => {
    const { data } = await api.delete<ApiResponse<void>>(`/products/${id}`);
    return data;
};

// 
export const restoreProduct = async (id: string) => {
    const { data } = await api.patch<ApiResponse<Product>>(
        `/products/${id}/restore`,
    );
    return data;
};