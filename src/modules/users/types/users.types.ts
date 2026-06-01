export type UserRole = "ADMIN" | "USER";

export interface AppUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UsersQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
}
