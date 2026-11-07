import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import type { ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";

/**
 * `invitacion` (T6-10) solo cambia el aviso: la petición es la misma. AUD-014 — el error lo pinta
 * la pantalla: un enlace caducado cambia la tarjeta entera a «Este enlace ya no sirve».
 */
export function useResetPassword(token: string, invitacion = false) {
    const navigate = useNavigate();
    const { t } = useT();

    return useMutation({
        mutationFn: (form: ResetPasswordForm) => AuthAPI.resetPassword(token, form.password),
        onSuccess: () => {
            toast.success(t(invitacion ? "auth.invitacion.hecho" : "auth.restablecer.hecho"));
            navigate("/auth/login");
        },
    });
}
