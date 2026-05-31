export interface Supplier {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SupplierForm {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
}
