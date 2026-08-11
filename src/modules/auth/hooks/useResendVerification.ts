import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useResendVerification() {
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (email: string) => AuthAPI.resendVerification(email),
        onSuccess: () => toast.success(t("auth.reenviar.enviado")),
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
