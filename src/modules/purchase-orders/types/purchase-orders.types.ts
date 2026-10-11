// T4-01 — la forma la define el contrato. Era el tipo más fiel de los doce y aun así
// declaraba `unitPrice: number` cuando llega como cadena.
import type { EstadoOrdenCompra, OrdenCompra } from "@/shared/contratos";

export type PurchaseOrderStatus = EstadoOrdenCompra;
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
    /** T5-14 — solo las de ese almacén. */
    warehouseId?: string;
}

/** T5-04 — una entrega: cuánto llega de cada línea. Las que no van no reciben nada. */
export interface RecepcionForm {
    /** T5-15 — `expiresAt` (`AAAA-MM-DD`) y `lotCode`: el lote en el que entra, si el producto los lleva. */
    items: Array<{ itemId: string; quantity: number; expiresAt?: string; lotCode?: string }>;
}

export interface CreatePurchaseOrderForm {
    supplierId?: string;
    notes?: string;
    /** T5-14 — a qué almacén entra lo recibido; sin él, al predeterminado. */
    warehouseId?: string;
    items: PurchaseOrderItemForm[];
}

/** T5-05 — las líneas revisadas en la pantalla de sugerencias, tal como se envían. */
export interface GenerarDesdeSugerenciasForm {
    /** T5-14 — el almacén de las órdenes que salgan; sin él, el predeterminado. */
    warehouseId?: string;
    items: Array<{ productId: string; quantity: number; unitPrice: number }>;
}
