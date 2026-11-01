import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getUsers, inviteUser, updateUserRole, activateUser, deactivateUser } from "../api/users.api";
import type { UsersQuery } from "../types/users.types";
import type { RolAsignable } from "@/shared/contratos";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const USERS_KEY = ["users"] as const;

export function useUsers(params?: UsersQuery) {
    return useQuery({
        queryKey: [...USERS_KEY, params],
        queryFn: () => getUsers(params),
    });
}

/** T6-10 — crea la cuenta y manda la invitación. */
export function useInviteUser() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: inviteUser,
        onSuccess: (usuario) => {
            qc.invalidateQueries({ queryKey: USERS_KEY });
            toast.success(t("usuarios.invitar.enviada", { correo: usuario.email }));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

/**
 * AUD-001 — dar el primer rol a una cuenta pendiente es aprobarla, y el servidor retira su aviso
 * de todas las campanas: la de quien aprueba tiene que enterarse ya, no al minuto.
 */
export function useUpdateUserRole() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, role }: { id: string; role: RolAsignable; aprobando?: string }) => updateUserRole(id, role),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: USERS_KEY });
            if (vars.aprobando !== undefined) qc.invalidateQueries({ queryKey: queryKeys.notifications });
            toast.success(vars.aprobando !== undefined ? t("usuarios.cuentaAprobada", { nombre: vars.aprobando }) : t("usuarios.rolActualizado"));
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
            // AUD-001 — desactivar una cuenta pendiente retira su aviso.
            qc.invalidateQueries({ queryKey: queryKeys.notifications });
            toast.success(t(vars.active ? "usuarios.activado" : "usuarios.desactivado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
