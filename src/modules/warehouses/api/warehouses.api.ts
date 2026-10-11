import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { Warehouse, WarehouseForm, WarehouseWithFigures } from "../types/warehouses.types";

const BASE = "/warehouses";

/** La lista que pide cada formulario para su selector: sin cifras, que cuestan una pasada por todo el catálogo. */
export const getWarehouses = async (): Promise<Warehouse[]> => {
    const { data } = await api.get<ApiResponse<Warehouse[]>>(BASE);
    return data.data!;
};

/** Los mismos, con lo que guarda cada uno: solo la pantalla de almacenes. */
export const getWarehousesSummary = async (): Promise<WarehouseWithFigures[]> => {
    const { data } = await api.get<ApiResponse<WarehouseWithFigures[]>>(`${BASE}/summary`);
    return data.data!;
};

export const createWarehouse = async (form: WarehouseForm): Promise<Warehouse> => {
    const { data } = await api.post<ApiResponse<Warehouse>>(BASE, form);
    return data.data!;
};

export const updateWarehouse = async (id: string, form: WarehouseForm): Promise<Warehouse> => {
    const { data } = await api.put<ApiResponse<Warehouse>>(`${BASE}/${id}`, form);
    return data.data!;
};

export const setDefaultWarehouse = async (id: string): Promise<Warehouse> => {
    const { data } = await api.patch<ApiResponse<Warehouse>>(`${BASE}/${id}/default`);
    return data.data!;
};

export const setWarehouseActive = async (id: string, active: boolean): Promise<Warehouse> => {
    const { data } = await api.patch<ApiResponse<Warehouse>>(`${BASE}/${id}/${active ? "activate" : "deactivate"}`);
    return data.data!;
};
