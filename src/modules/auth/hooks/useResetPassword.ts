import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";

export function useResetPassword(token: string) {
    const navigate = useNavigate();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (form: ResetPasswordForm) => AuthAPI.resetPassword(token, form.password),
        onSuccess: () => {
            toast.success(t("auth.restablecer.hecho"));
            navigate("/auth/login");
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
