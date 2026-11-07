import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";
import type { EstadoDeAcceso } from "@/modules/auth/lib/estadoDeAcceso";

/**
 * AUD-014 — el enlace se comprueba al abrir la pantalla, sin consumirlo. Antes un enlace caducado
 * se descubría al enviar: lo escrito se perdía, el foco caía en `<body>` y nada se anunciaba.
 *
 * Sin `retry`: un 400 no va a cambiar por repetirlo. Y sin caché entre visitas (`gcTime: 0`):
 * el mismo enlace puede haberse usado en otra pestaña.
 */
export function useEnlaceDeRestablecer(token: string) {
    return useQuery({
        queryKey: [...queryKeys.enlaceDeRestablecer, token],
        queryFn: ({ signal }) => AuthAPI.checkResetToken(token, signal),
        enabled: token !== "",
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    });
}

/**
 * `invitacion` (T6-10) solo cambia el aviso: la petición es la misma. AUD-014 — el error lo pinta
 * la pantalla, y el éxito se dice en la tarjeta del login, que es donde se usa la contraseña
 * nueva (antes, un aviso flotante que se iba solo). Se lleva el correo, ya escrito.
 */
export function useResetPassword(token: string, invitacion = false, correo?: string) {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (form: ResetPasswordForm) => AuthAPI.resetPassword(token, form.password),
        onSuccess: () => {
            const state: EstadoDeAcceso = { aviso: invitacion ? "invitacionGuardada" : "restablecida", correo };
            navigate("/auth/login", { state });
        },
    });
}
