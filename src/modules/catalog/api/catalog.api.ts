import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { Category, Brand, CatalogItemForm } from "@/modules/catalog/types/catalog.types";

// ── Categories ────────────────────────────────────────────────────────────────

export const CategoriesAPI = {
    getAll: async () => {
        const { data } = await api.get<ApiResponse<Category[]>>("/categories");
        return data.data!;
    },
    create: async (form: CatalogItemForm) => {
        const { data } = await api.post<ApiResponse<Category>>("/categories", form);
        return data.data!;
    },
    update: async ({ id, form }: { id: string; form: CatalogItemForm }) => {
        const { data } = await api.put<ApiResponse<Category>>(`/categories/${id}`, form);
        return data.data!;
    },
    delete: async (id: string) => {
        await api.delete(`/categories/${id}`);
    },
};

// ── Brands ────────────────────────────────────────────────────────────────────

export const BrandsAPI = {
    getAll: async () => {
        const { data } = await api.get<ApiResponse<Brand[]>>("/brands");
        return data.data!;
    },
    create: async (form: CatalogItemForm) => {
        const { data } = await api.post<ApiResponse<Brand>>("/brands", form);
        return data.data!;
    },
    update: async ({ id, form }: { id: string; form: CatalogItemForm }) => {
        const { data } = await api.put<ApiResponse<Brand>>(`/brands/${id}`, form);
        return data.data!;
    },
    delete: async (id: string) => {
        await api.delete(`/brands/${id}`);
    },
};
