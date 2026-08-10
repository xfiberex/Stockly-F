// T4-01 — `UserRole` era una unión de cadenas escrita a mano que espejaba el enum `Role`
// de Prisma. Ahora sale del contrato, y añadir un rol en el backend lo trae aquí solo.
import type { Rol, Usuario } from "@/shared/contratos";

export type UserRole = Rol;
export type AppUser = Usuario;

export interface UsersQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
}
