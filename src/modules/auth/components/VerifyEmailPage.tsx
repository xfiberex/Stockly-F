import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Spinner } from "@/shared/components/Spinner";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export default function VerifyEmailPage() {
    const { t, idioma } = useT();
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        token ? "loading" : "error"
    );
    // Solo se guarda el motivo que **viene de la API**, ya resuelto por `mensajeDeError`.
    // El caso de «no hay token» no se guarda: es una condición, no un mensaje, y se
    // traduce al pintar para que siga al idioma si se cambia con la página delante.
    const [motivo, setMotivo] = useState("");

    useEffect(() => {
        if (!token) return;

        // Flag para evitar el doble efecto de React StrictMode en desarrollo:
        // si el componente se desmonta antes de que la promesa resuelva, ignoramos el resultado.
        let mounted = true;

        AuthAPI.verifyEmail(token)
            .then(() => {
                if (mounted) setStatus("success");
            })
            .catch((e) => {
                if (!mounted) return;
                setStatus("error");
                // El `code` de la API traducido; si no lo trae, el respaldo de esta pantalla.
                setMotivo(mensajeDeError(idioma, e, "auth.verificar.invalido"));
            });

        return () => {
            mounted = false;
        };
    }, [token, idioma]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
            {status === "loading" && <Spinner size="lg" />}
            {status === "success" && (
                <>
                    <p className="text-success font-medium text-xl">{t("auth.verificar.confirmada")}</p>
                    <Link to="/auth/login" className="text-info hover:underline text-sm">
                        {t("auth.registro.inicia")}
                    </Link>
                </>
            )}
            {status === "error" && (
                <>
                    <p className="text-danger font-medium">{motivo || t("auth.verificar.sinToken")}</p>
                    <Link
                        to="/auth/resend-verification"
                        className="text-info hover:underline text-sm"
                    >
                        {t("auth.verificar.solicitarEnlace")}
                    </Link>
                    <Link to="/auth/login" className="text-foreground-muted hover:underline text-sm">
                        {t("auth.volverAlLogin")}
                    </Link>
                </>
            )}
        </div>
    );
}
