import api from "@/shared/api/axios";
import { descargarDeLaApi } from "@/shared/api/descargar";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import { escribirNumeroDeVenta } from "@/shared/contratos";
import type { CounterSaleDto, SaleOrder, SaleOrderStatus, CreateSaleOrderDto, UpdateSaleOrderDto } from "../types/sale-orders.types";

/**
 * T5-06 — `customerId` trae solo las de un cliente: el historial de su ficha.
 *
 * T6-01 — `from` y `to` son días (`AAAA-MM-DD`) de la fecha de creación, los dos incluidos. Son
 * días **del negocio**: dónde empiezan lo decide el servidor con la zona de Configuración, no el
 * navegador.
 *
 * T6-04 — `number` es el correlativo, solo cifras y exacto: `123` y `000123` son la misma venta.
 */
export interface SaleOrdersQuery {
    page?: number;
    limit?: number;
    number?: string;
    customerId?: string;
    status?: SaleOrderStatus;
    from?: string;
    to?: string;
    /** T5-14 — solo las de ese almacén. */
    warehouseId?: string;
}

export const getSaleOrders = async (params: SaleOrdersQuery = {}): Promise<PaginatedResponse<SaleOrder>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<SaleOrder>>>("/sale-orders", { params });
    return data.data!;
};

export const createSaleOrder = async (dto: CreateSaleOrderDto): Promise<SaleOrder> => {
    const { data } = await api.post<ApiResponse<SaleOrder>>("/sale-orders", dto);
    return data.data!;
};

/** T6-08 — la venta de mostrador: vuelve ya enviada, con su número y sus importes. */
export const createCounterSale = async (dto: CounterSaleDto): Promise<SaleOrder> => {
    const { data } = await api.post<ApiResponse<SaleOrder>>("/sale-orders/counter", dto);
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

/**
 * T6-07 — el comprobante de una venta enviada, en PDF. El archivo se llama como lo nombra el
 * servidor: `comprobante-000123.pdf`.
 */
export const descargarComprobante = (orden: Pick<SaleOrder, "id" | "number">): Promise<boolean> =>
    descargarDeLaApi(`/sale-orders/${orden.id}/receipt`, {}, `comprobante-${escribirNumeroDeVenta(orden.number)}.pdf`);

export const exportSaleOrdersCsv = (): Promise<boolean> =>
    descargarDeLaApi("/sale-orders/export", { format: "csv" }, `stockly-ventas-${new Date().toISOString().split("T")[0]}.csv`);
