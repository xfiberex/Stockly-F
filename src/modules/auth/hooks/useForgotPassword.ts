import { useMutation } from "@tanstack/react-query";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import type { ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";

/**
 * AUD-014 — el resultado lo pinta la pantalla. T4-04: el texto sale del catálogo, no del
 * `message` del servidor, que viene siempre en español.
 */
export function useForgotPassword() {
    return useMutation({
        // Recibe el correo, como el reenvío: las dos pantallas comparten `PedirEnlacePorCorreo`.
        mutationFn: (email: string) => AuthAPI.forgotPassword({ email } satisfies ForgotPasswordForm),
    });
}
