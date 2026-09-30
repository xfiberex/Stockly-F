import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type {
    CountedLine,
    InventoryCount,
    InventoryCountLine,
    InventoryCountLines,
    InventoryCountLinesQuery,
    InventoryCountsQuery,
    NewInventoryCount,
} from "../types/inventory-counts.types";

const BASE = "/inventory-counts";

export const getInventoryCounts = async (params?: InventoryCountsQuery): Promise<PaginatedResponse<InventoryCount>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<InventoryCount>>>(BASE, { params });
    return data.data!;
};

export const getInventoryCount = async (id: string): Promise<InventoryCount> => {
    const { data } = await api.get<ApiResponse<InventoryCount>>(`${BASE}/${id}`);
    return data.data!;
};

export const getInventoryCountLines = async (id: string, params: InventoryCountLinesQuery): Promise<InventoryCountLines> => {
    const { data } = await api.get<ApiResponse<InventoryCountLines>>(`${BASE}/${id}/lines`, { params });
    return data.data!;
};

export const createInventoryCount = async (dto: NewInventoryCount): Promise<InventoryCount> => {
    const { data } = await api.post<ApiResponse<InventoryCount>>(BASE, dto);
    return data.data!;
};

export const recordInventoryCountLines = async (id: string, items: CountedLine[]): Promise<InventoryCountLine[]> => {
    const { data } = await api.patch<ApiResponse<InventoryCountLine[]>>(`${BASE}/${id}/lines`, { items });
    return data.data!;
};

export const closeInventoryCount = async (id: string): Promise<InventoryCount> => {
    const { data } = await api.post<ApiResponse<InventoryCount>>(`${BASE}/${id}/close`);
    return data.data!;
};

export const cancelInventoryCount = async (id: string): Promise<InventoryCount> => {
    const { data } = await api.post<ApiResponse<InventoryCount>>(`${BASE}/${id}/cancel`);
    return data.data!;
};
