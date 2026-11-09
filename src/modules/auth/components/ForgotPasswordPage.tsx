import { useT } from "@/shared/hooks/useIdioma";
import { useTituloDePantalla } from "@/shared/hooks/useTituloDePantalla";
import { useForgotPassword } from "@/modules/auth/hooks/useForgotPassword";
import { PedirEnlacePorCorreo } from "@/modules/auth/components/PedirEnlacePorCorreo";
import { useEstadoDeAcceso } from "@/modules/auth/lib/estadoDeAcceso";

/**
 * AUD-014 — también es la salida de una invitación caducada: la cuenta ya existe, y el enlace
 * de restablecer sirve para elegir la primera contraseña. Quien llega de ahí nunca tuvo una, así
 * que la pantalla habla de **elegirla**, no de recuperarla, y la pestaña dice lo mismo.
 */
export default function ForgotPasswordPage() {
    const { t } = useT();
    const forgot = useForgotPassword();
    const { invitacion } = useEstadoDeAcceso();
    useTituloDePantalla(invitacion ? "auth.recuperar.invitacionTitulo" : null);

    return (
        <PedirEnlacePorCorreo
            titulo={t(invitacion ? "auth.recuperar.invitacionTitulo" : "ruta.recuperar")}
            subtitulo={t(invitacion ? "auth.recuperar.invitacionSubtitulo" : "auth.recuperar.subtitulo")}
            boton={t("auth.recuperar.enviar")}
            enviado={(correo) => t("auth.recuperar.enviado", { correo })}
            pedir={forgot}
        />
    );
}
