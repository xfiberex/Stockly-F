// T5-14 — los tipos salen del contrato; aquí solo se les da nombre y se declaran las peticiones.
import type { Transferencia, TransferenciaConLineas } from "@/shared/contratos";

export type StockTransfer = Transferencia;
export type StockTransferDetail = TransferenciaConLineas;

export interface StockTransfersQuery {
    page?: number;
    limit?: number;
    /** Las que salen de ese almacén o entran en él. */
    warehouseId?: string;
}

export interface NewStockTransfer {
    fromWarehouseId: string;
    toWarehouseId: string;
    note?: string;
    items: Array<{ productId: string; quantity: number }>;
}
