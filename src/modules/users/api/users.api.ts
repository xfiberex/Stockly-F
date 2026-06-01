import api from "@/shared/api/axios";
import type { ApiResponse, PaginatedResponse } from "@/shared/types";
import type { AppUser, UserRole, UsersQuery } from "../types/users.types";

export const getUsers = async (params?: UsersQuery): Promise<PaginatedResponse<AppUser>> => {
    const { data } = await api.get<ApiResponse<PaginatedResponse<AppUser>>>("/users", { params });
    return data.data!;
};

export const updateUserRole = async (id: string, role: UserRole): Promise<AppUser> => {
    const { data } = await api.patch<ApiResponse<AppUser>>(`/users/${id}/role`, { role });
    return data.data!;
};

export const activateUser = async (id: string): Promise<AppUser> => {
    const { data } = await api.patch<ApiResponse<AppUser>>(`/users/${id}/activate`);
    return data.data!;
};

export const deactivateUser = async (id: string): Promise<AppUser> => {
    const { data } = await api.patch<ApiResponse<AppUser>>(`/users/${id}/deactivate`);
    return data.data!;
};
