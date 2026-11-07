import { useMutation } from "@tanstack/react-query";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import type { RegisterForm } from "@/modules/auth/schemas/auth.schema";

/**
 * AUD-014 — sin aviso ni redirección: la pantalla de registro enseña «Revisa tu correo» con los
 * dos pasos que faltan, y el error dentro de la tarjeta. Antes un aviso de 3 s lo contaba
 * mientras se saltaba al login, donde no había nada que hacer todavía.
 */
export function useRegister() {
    return useMutation({
        mutationFn: (form: RegisterForm) =>
            AuthAPI.register({ name: form.name, email: form.email, password: form.password }),
    });
}
