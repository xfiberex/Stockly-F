// T4-01 — el sobre y la paginación salen del contrato, no de una copia local.
import type { Paginado, Sobre } from "@/shared/contratos";

export type ApiResponse<T = unknown> = Sobre<T>;
export type PaginatedResponse<T> = Paginado<T>;
