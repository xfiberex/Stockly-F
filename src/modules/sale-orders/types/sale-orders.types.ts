// T4-01 — la forma la define el contrato. `unitPrice` se declaraba `number` y llega como
// cadena (`Decimal` de Prisma); ahora es `Importe` y hay que decidir qué se hace con él.
import type { EstadoOrdenVenta, ItemOrdenVenta, OrdenVenta } from "@/shared/contratos";

export type SaleOrderStatus = EstadoOrdenVenta;
export type SaleOrderItem = ItemOrdenVenta;
export type SaleOrder = OrdenVenta;

/** Lo que se envía al crear, no lo que se recibe: aquí `unitPrice` sí es un número. */
export interface CreateSaleOrderItemDto {
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface CreateSaleOrderDto {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: string;
    items: CreateSaleOrderItemDto[];
}

export interface UpdateSaleOrderDto {
    status?: SaleOrderStatus;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    notes?: string;
}
