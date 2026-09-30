import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type {
    Customer,
    CustomerDetail,
    CustomerForm,
    CustomerListItem,
    CustomersQuery,
} from "@/modules/customers/types/customer.types";

export const CustomersAPI = {
    getAll: async ({ search, ...resto }: CustomersQuery = {}) => {
        // Una búsqueda vacía no se manda: `?search=` es lo mismo que no buscar, pero ensucia la URL.
        const params = { ...resto, ...(search?.trim() && { search: search.trim() }) };
        const { data } = await api.get<ApiResponse<PaginatedResponse<CustomerListItem>>>("/customers", { params });
        return data.data!;
    },
    getById: async (id: string) => {
        const { data } = await api.get<ApiResponse<CustomerDetail>>(`/customers/${id}`);
        return data.data!;
    },
    create: async (form: CustomerForm) => {
        const { data } = await api.post<ApiResponse<Customer>>("/customers", form);
        return data.data!;
    },
    update: async ({ id, form }: { id: string; form: CustomerForm }) => {
        const { data } = await api.put<ApiResponse<Customer>>(`/customers/${id}`, form);
        return data.data!;
    },
    delete: async (id: string) => {
        await api.delete(`/customers/${id}`);
    },
};
