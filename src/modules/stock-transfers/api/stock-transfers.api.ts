import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type { NewStockTransfer, StockTransfer, StockTransferDetail, StockTransfersQuery } from "../types/stock-transfers.types";

const BASE = "/stock-transfers";

export const getStockTransfers = async (params?: StockTransfersQuery): Promise<PaginatedResponse<StockTransfer>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<StockTransfer>>>(BASE, { params });
    return data.data!;
};

export const getStockTransfer = async (id: string): Promise<StockTransferDetail> => {
    const { data } = await api.get<ApiResponse<StockTransferDetail>>(`${BASE}/${id}`);
    return data.data!;
};

export const createStockTransfer = async (dto: NewStockTransfer): Promise<StockTransferDetail> => {
    const { data } = await api.post<ApiResponse<StockTransferDetail>>(BASE, dto);
    return data.data!;
};
