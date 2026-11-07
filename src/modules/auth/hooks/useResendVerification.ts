import { useMutation } from "@tanstack/react-query";
import { AuthAPI } from "@/modules/auth/api/auth.api";

/** AUD-014 — el resultado lo pinta la pantalla: el éxito en su sitio, el error en la tarjeta. */
export function useResendVerification() {
    return useMutation({
        mutationFn: (email: string) => AuthAPI.resendVerification(email),
    });
}
