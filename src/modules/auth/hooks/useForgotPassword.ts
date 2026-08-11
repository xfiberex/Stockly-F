import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";

export function useForgotPassword() {
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (form: ForgotPasswordForm) => AuthAPI.forgotPassword(form),
        // T4-04: el aviso sale del catálogo, no del `message` del servidor. Ese mensaje
        // viene siempre en español, así que en inglés se colaba una frase suelta en
        // mitad de la pantalla — y quien pulsa el botón ya sabe qué pidió.
        onSuccess: () => toast.success(t("auth.recuperar.enviado")),
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
