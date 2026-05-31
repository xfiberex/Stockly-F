import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { PurchaseOrder, CreatePurchaseOrderForm } from "../types/purchase-orders.types";

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    const { data } = await api.get<ApiResponse<PurchaseOrder[]>>("/purchase-orders");
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
