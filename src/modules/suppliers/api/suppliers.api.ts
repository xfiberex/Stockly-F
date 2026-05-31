import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { Supplier, SupplierForm } from "@/modules/suppliers/types/supplier.types";

export const SuppliersAPI = {
    getAll: async () => {
        const { data } = await api.get<ApiResponse<Supplier[]>>("/suppliers");
        return data.data!;
    },
    create: async (form: SupplierForm) => {
        const { data } = await api.post<ApiResponse<Supplier>>("/suppliers", form);
        return data.data!;
    },
    update: async ({ id, form }: { id: string; form: SupplierForm }) => {
        const { data } = await api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, form);
        return data.data!;
    },
    delete: async (id: string) => {
        await api.delete(`/suppliers/${id}`);
    },
};
