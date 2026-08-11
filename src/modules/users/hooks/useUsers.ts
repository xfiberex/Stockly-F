import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getUsers, updateUserRole, activateUser, deactivateUser } from "../api/users.api";
import type { UserRole, UsersQuery } from "../types/users.types";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const USERS_KEY = ["users"] as const;

export function useUsers(params?: UsersQuery) {
    return useQuery({
        queryKey: [...USERS_KEY, params],
        queryFn: () => getUsers(params),
    });
}

export function useUpdateUserRole() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUserRole(id, role),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: USERS_KEY });
            toast.success(t("usuarios.rolActualizado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useSetUserActive() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            active ? activateUser(id) : deactivateUser(id),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: USERS_KEY });
            toast.success(t(vars.active ? "usuarios.activado" : "usuarios.desactivado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
