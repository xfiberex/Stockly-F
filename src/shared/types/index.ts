// Este archivo contiene tipos y interfaces compartidos que pueden ser utilizados en toda la aplicación
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Tipo para representar una respuesta paginada de la API
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}