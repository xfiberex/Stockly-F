import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { UpdatePasswordForm } from "@/modules/auth/schemas/auth.schema";

export function useUpdatePassword() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (form: UpdatePasswordForm) =>
            AuthAPI.updatePassword({ currentPassword: form.currentPassword, password: form.password }),
        onSuccess: () => {
            // El backend limpia la cookie; limpiamos el cache y redirigimos al login
            qc.removeQueries({ queryKey: queryKeys.user });
            toast.success(t("auth.perfil.contrasenaActualizada"));
            navigate("/auth/login");
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
