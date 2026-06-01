export type SaleOrderStatus = "PENDING" | "SHIPPED" | "CANCELLED";

export interface SaleOrderItem {
    id: string;
    productId: string | null;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface SaleOrder {
    id: string;
    status: SaleOrderStatus;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    notes: string | null;
    items: SaleOrderItem[];
    createdAt: string;
    updatedAt: string;
}

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
