import api from "@/shared/api/axios";
import { descargarDeLaApi } from "@/shared/api/descargar";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type { SaleOrder, CreateSaleOrderDto, UpdateSaleOrderDto } from "../types/sale-orders.types";

export const getSaleOrders = async (): Promise<PaginatedResponse<SaleOrder>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<SaleOrder>>>("/sale-orders");
    return data.data!;
};

export const createSaleOrder = async (dto: CreateSaleOrderDto): Promise<SaleOrder> => {
    const { data } = await api.post<ApiResponse<SaleOrder>>("/sale-orders", dto);
    return data.data!;
};

export const updateSaleOrder = async (id: string, dto: UpdateSaleOrderDto): Promise<SaleOrder> => {
    const { data } = await api.patch<ApiResponse<SaleOrder>>(`/sale-orders/${id}`, dto);
    return data.data!;
};

/** T5-13 — enviar por su propia ruta, la que admite el rol de almacén. */
export const shipSaleOrder = async (id: string): Promise<SaleOrder> => {
    const { data } = await api.post<ApiResponse<SaleOrder>>(`/sale-orders/${id}/ship`);
    return data.data!;
};

export const deleteSaleOrder = async (id: string): Promise<void> => {
    await api.delete(`/sale-orders/${id}`);
};

export const exportSaleOrdersCsv = (): Promise<boolean> =>
    descargarDeLaApi("/sale-orders/export", { format: "csv" }, `stockly-ventas-${new Date().toISOString().split("T")[0]}.csv`);
