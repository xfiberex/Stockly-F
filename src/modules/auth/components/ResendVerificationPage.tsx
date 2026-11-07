import { useT } from "@/shared/hooks/useIdioma";
import { useResendVerification } from "@/modules/auth/hooks/useResendVerification";
import { PedirEnlacePorCorreo } from "@/modules/auth/components/PedirEnlacePorCorreo";

export default function ResendVerificationPage() {
    const { t } = useT();
    const resend = useResendVerification();

    return (
        <PedirEnlacePorCorreo
            titulo={t("ruta.reenviarVerificacion")}
            subtitulo={t("auth.reenviar.subtitulo")}
            boton={t("auth.reenviar.boton")}
            enviado={t("auth.reenviar.enviado")}
            pedir={resend}
        />
    );
}
