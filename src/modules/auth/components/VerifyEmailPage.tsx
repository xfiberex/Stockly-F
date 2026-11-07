import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/shared/components/Spinner";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import { codigoDeError, mensajeDeError } from "@/shared/lib/errorApi";
import { cn } from "@/shared/lib/cn";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { AvisoDeAcceso, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { EnlaceCaducado } from "@/modules/auth/components/EnlaceCaducado";

type Estado =
    | { tipo: "cargando" }
    | { tipo: "hecho"; yaConfirmada: boolean; esperaAprobacion: boolean }
    | { tipo: "caducado" }
    | { tipo: "error"; error: unknown };

/**
 * Confirmar la cuenta desde el enlace del correo.
 *
 * AUD-014 — abrir el enlace por segunda vez ya no es un error: el servidor dice que la cuenta
 * estaba confirmada y si falta la aprobación de un administrador, y la pantalla dice eso. Antes
 * «ya verificada» se pintaba en rojo como un enlace inválido. Sin enlace, o caducado, la misma
 * tarjeta que en restablecer, con un único siguiente paso.
 */
export default function VerifyEmailPage() {
    const { t, idioma } = useT();
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const [estado, setEstado] = useState<Estado>(token ? { tipo: "cargando" } : { tipo: "caducado" });

    useEffect(() => {
        if (!token) return;
        // Para el doble efecto de StrictMode: si se desmonta antes de responder, se ignora.
        let montado = true;

        AuthAPI.verifyEmail(token)
            .then((respuesta) => {
                if (!montado) return;
                // Un backend anterior no manda `data`: se asume lo más común, recién confirmada y pendiente.
                setEstado({
                    tipo: "hecho",
                    yaConfirmada: respuesta?.data?.alreadyVerified ?? false,
                    esperaAprobacion: respuesta?.data?.pendingApproval ?? true,
                });
            })
            .catch((e) => {
                if (!montado) return;
                setEstado(codigoDeError(e) === "INVALID_OR_EXPIRED_TOKEN" ? { tipo: "caducado" } : { tipo: "error", error: e });
            });

        return () => {
            montado = false;
        };
    }, [token]);

    if (estado.tipo === "caducado") {
        return (
            <EnlaceCaducado
                pedirOtro="/auth/resend-verification"
                textoPedirOtro={t("auth.verificar.solicitarEnlace")}
                explicacion={t("auth.enlace.verificar")}
            />
        );
    }

    if (estado.tipo === "cargando") {
        return (
            <MarcoDeAcceso titulo={t("ruta.confirmarCuenta")}>
                <div className="flex justify-center py-4">
                    <Spinner size="lg" />
                </div>
            </MarcoDeAcceso>
        );
    }

    if (estado.tipo === "error") {
        return (
            <MarcoDeAcceso titulo={t("ruta.confirmarCuenta")}>
                <AvisoDeAcceso>
                    <p>{mensajeDeError(idioma, estado.error, "auth.verificar.invalido")}</p>
                </AvisoDeAcceso>
                <Link to="/auth/login" className={cn(clasesDeBoton("secondary"), "w-full")}>{t("auth.volverAlLogin")}</Link>
            </MarcoDeAcceso>
        );
    }

    return (
        <MarcoDeAcceso titulo={t(estado.yaConfirmada ? "auth.verificar.yaConfirmada" : "auth.verificar.confirmada")}>
            <div role="status" className="space-y-3 text-center text-sm text-foreground">
                <CheckCircleIcon aria-hidden="true" className="mx-auto h-10 w-10 text-success" />
                {/* AUD-001 — sin esto, entraría al login y se encontraría el 403 sin saber por qué. */}
                <p>{t(estado.esperaAprobacion ? "auth.verificar.esperaAprobacion" : "auth.verificar.puedesEntrar")}</p>
            </div>
            <Link to="/auth/login" className={cn(clasesDeBoton(estado.esperaAprobacion ? "secondary" : "primary"), "w-full")}>
                {t(estado.esperaAprobacion ? "auth.volverAlLogin" : "auth.registro.inicia")}
            </Link>
        </MarcoDeAcceso>
    );
}
