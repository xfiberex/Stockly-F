// T4-01 — la forma la define el contrato.
import type { Proveedor } from "@/shared/contratos";

export type Supplier = Proveedor;

/** Lo que se envía. `leadTimeDays: null` borra el plazo; ausente, no lo toca. */
export interface SupplierForm {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    leadTimeDays?: number | null;
}

/**
 * Lo que tiene el formulario mientras se escribe: el plazo es el texto del campo, y vacío
 * significa «sin plazo» (T5-05). Se convierte al enviar, no al teclear.
 */
export interface SupplierFormValues extends Omit<SupplierForm, "leadTimeDays"> {
    leadTimeDays: string;
}
