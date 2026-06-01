import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getUsers, updateUserRole, activateUser, deactivateUser } from "../api/users.api";
import type { UserRole, UsersQuery } from "../types/users.types";

export const USERS_KEY = ["users"] as const;

export function useUsers(params?: UsersQuery) {
    return useQuery({
        queryKey: [...USERS_KEY, params],
        queryFn: () => getUsers(params),
    });
}

export function useUpdateUserRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUserRole(id, role),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: USERS_KEY });
            toast.success("Rol actualizado");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al cambiar el rol"),
    });
}

export function useSetUserActive() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            active ? activateUser(id) : deactivateUser(id),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: USERS_KEY });
            toast.success(vars.active ? "Usuario activado" : "Usuario desactivado");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al cambiar el estado del usuario"),
    });
}
