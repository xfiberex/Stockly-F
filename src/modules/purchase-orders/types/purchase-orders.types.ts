// T4-01 — la forma la define el contrato. Era el tipo más fiel de los doce y aun así
// declaraba `unitPrice: number` cuando llega como cadena.
import type { EstadoOrdenCompra, ItemOrdenCompra, OrdenCompra } from "@/shared/contratos";

export type PurchaseOrderStatus = EstadoOrdenCompra;
export type PurchaseOrderItem = ItemOrdenCompra;
export type PurchaseOrder = OrdenCompra;

/** Lo que se envía, no lo que se recibe: en el formulario `unitPrice` es un número. */
export interface PurchaseOrderItemForm {
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface PurchaseOrderQuery {
    page?: number;
    limit?: number;
    status?: PurchaseOrderStatus;
}

export interface CreatePurchaseOrderForm {
    supplierId?: string;
    notes?: string;
    items: PurchaseOrderItemForm[];
}
