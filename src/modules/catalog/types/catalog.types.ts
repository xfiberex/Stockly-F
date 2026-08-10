// T4-01 — la forma la define el contrato; aquí solo se le pone el nombre que usa la app.
import type { Categoria, Marca } from "@/shared/contratos";

export type Category = Categoria;
export type Brand = Marca;

/** Formulario, no respuesta: es lo que se envía, y lo valida el backend. */
export interface CatalogItemForm {
    name: string;
    description?: string;
}
