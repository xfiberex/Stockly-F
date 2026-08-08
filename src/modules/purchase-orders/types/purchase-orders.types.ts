export type PurchaseOrderStatus = "PENDING" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
    id: string;
    purchaseOrderId: string;
    productId: string | null;
    product: { id: string; name: string; sku: string | null } | null;
    productName: string;
    quantity: number;
    unitPrice: number;
    createdAt: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string | null;
    supplier: { id: string; name: string } | null;
    status: PurchaseOrderStatus;
    notes: string | null;
    items: PurchaseOrderItem[];
    createdAt: string;
    updatedAt: string;
}

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
