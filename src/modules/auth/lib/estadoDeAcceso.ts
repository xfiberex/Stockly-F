import { useLocation } from "react-router-dom";

/**
 * AUD-014 — lo que viaja de una pantalla de acceso a otra, en `location.state`.
 *
 * - `correo`: el que ya se escribió. Del login a «¿Olvidaste…?» o a «Reenviar» y de vuelta, para
 *   no teclearlo dos veces. Va en el estado y no en `?email=`: así no queda en el historial ni
 *   en los registros de acceso.
 * - `invitacion`: se viene de una invitación caducada. «Olvidé la contraseña» habla entonces de
 *   elegirla, no de recuperarla: quien llega nunca tuvo una.
 * - `aviso`: la contraseña nueva ya está guardada. Se dice en la tarjeta del login, donde se va a
 *   usar, y no en un aviso flotante que se va solo.
 */
export interface EstadoDeAcceso {
    correo?: string;
    invitacion?: boolean;
    aviso?: "restablecida" | "invitacionGuardada";
}

/** El estado con el que se llegó, comprobado: `location.state` puede traer cualquier cosa. */
export function useEstadoDeAcceso(): EstadoDeAcceso {
    const { state } = useLocation();
    if (!state || typeof state !== "object") return {};
    const { correo, invitacion, aviso } = state as Record<string, unknown>;
    return {
        correo: typeof correo === "string" ? correo : undefined,
        invitacion: invitacion === true || undefined,
        aviso: aviso === "restablecida" || aviso === "invitacionGuardada" ? aviso : undefined,
    };
}
