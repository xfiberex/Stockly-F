import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type {
    PurchaseOrder,
    CreatePurchaseOrderForm,
    PurchaseOrderQuery,
} from "../types/purchase-orders.types";

// Desde T2-03 el endpoint responde `{ data, meta }` como el resto de listados.
export const getPurchaseOrders = async (
    params?: PurchaseOrderQuery,
): Promise<PaginatedResponse<PurchaseOrder>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<PurchaseOrder>>>("/purchase-orders", {
        params,
    });
    return data.data!;
};

export const getPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
    const { data } = await api.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`);
    return data.data!;
};

export const createPurchaseOrder = async (dto: CreatePurchaseOrderForm): Promise<PurchaseOrder> => {
    const { data } = await api.post<ApiResponse<PurchaseOrder>>("/purchase-orders", dto);
    return data.data!;
};

export const updatePurchaseOrder = async (
    id: string,
    dto: { supplierId?: string; notes?: string; status?: string },
): Promise<PurchaseOrder> => {
    const { data } = await api.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, dto);
    return data.data!;
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
    await api.delete(`/purchase-orders/${id}`);
};

export const exportPurchaseOrdersCsv = (): void => {
    const a = document.createElement("a");
    a.href = `${api.defaults.baseURL}/purchase-orders/export?format=csv`;
    a.download = `stockly-compras-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
};
