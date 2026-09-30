// T5-07 — los tipos salen del contrato; aquí solo se les da nombre y se declaran las consultas.
import type { Conteo, EstadoConteo, FiltroLineasConteo, LineaConteo, LineasConteo } from "@/shared/contratos";

export type InventoryCount = Conteo;
export type InventoryCountStatus = EstadoConteo;
export type InventoryCountLine = LineaConteo;
export type InventoryCountLines = LineasConteo;
export type InventoryCountLineFilter = FiltroLineasConteo;

export interface InventoryCountsQuery {
    page?: number;
    limit?: number;
    status?: InventoryCountStatus;
}

export interface InventoryCountLinesQuery {
    page?: number;
    limit?: number;
    filter?: InventoryCountLineFilter;
    search?: string;
    /** T5-08 — solo la línea de ese producto: la del que se acaba de escanear. */
    productId?: string;
}

export interface NewInventoryCount {
    categoryId?: string | null;
    note?: string;
}

export interface CountedLine {
    productId: string;
    countedQuantity: number;
}
