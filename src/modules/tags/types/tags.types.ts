// T4-01 — la forma la define el contrato.
import type { Etiqueta } from "@/shared/contratos";

export type Tag = Etiqueta;

export interface CreateTagDto {
    name: string;
    color?: string;
}

export interface UpdateTagDto {
    name?: string;
    color?: string;
}
