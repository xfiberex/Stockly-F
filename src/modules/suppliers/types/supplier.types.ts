// T4-01 — la forma la define el contrato.
import type { Proveedor } from "@/shared/contratos";

export type Supplier = Proveedor;

export interface SupplierForm {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
}
