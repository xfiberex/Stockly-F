// T5-14 — los tipos salen del contrato; aquí solo se les da nombre.
import type { Almacen, AlmacenConCifras } from "@/shared/contratos";

export type Warehouse = Almacen;
export type WarehouseWithFigures = AlmacenConCifras;

export interface WarehouseForm {
    name: string;
    address?: string;
}
