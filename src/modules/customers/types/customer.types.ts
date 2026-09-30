// T5-06 — la forma la define el contrato.
import type { Cliente, ClienteEnListado, FichaCliente } from "@/shared/contratos";

export type Customer = Cliente;
export type CustomerListItem = ClienteEnListado;
export type CustomerDetail = FichaCliente;

/** Lo que se envía al crear o editar. Al editar, un campo vacío lo borra. */
export interface CustomerForm {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
}

export interface CustomersQuery {
    page?: number;
    limit?: number;
    search?: string;
}
