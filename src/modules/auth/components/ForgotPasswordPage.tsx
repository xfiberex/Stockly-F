import { useT } from "@/shared/hooks/useIdioma";
import { useForgotPassword } from "@/modules/auth/hooks/useForgotPassword";
import { PedirEnlacePorCorreo } from "@/modules/auth/components/PedirEnlacePorCorreo";

export default function ForgotPasswordPage() {
    const { t } = useT();
    const forgot = useForgotPassword();

    return (
        <PedirEnlacePorCorreo
            titulo={t("ruta.recuperar")}
            subtitulo={t("auth.recuperar.subtitulo")}
            boton={t("auth.recuperar.enviar")}
            enviado={(correo) => t("auth.recuperar.enviado", { correo })}
            pedir={forgot}
        />
    );
}
