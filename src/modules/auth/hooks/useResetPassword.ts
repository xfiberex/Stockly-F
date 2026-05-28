import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import type { ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";

export function useResetPassword(token: string) {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (form: ResetPasswordForm) => AuthAPI.resetPassword(token, form.password),
        onSuccess: () => {
            toast.success("Contraseña restablecida. Inicia sesión.");
            navigate("/auth/login");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
