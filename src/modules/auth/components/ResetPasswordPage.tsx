import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { codigoDeError, mensajeDeError } from "@/shared/lib/errorApi";
import { resetPasswordSchema, type ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useResetPassword } from "@/modules/auth/hooks/useResetPassword";
import { AvisoDeAcceso, CampoDeContrasena, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { EnlaceCaducado } from "@/modules/auth/components/EnlaceCaducado";

export default function ResetPasswordPage() {
    const { t, te, idioma } = useT();
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    // T6-10 — el enlace de una invitación llega aquí con `invitacion=1`. Quien lo abre no ha
    // olvidado nada: los textos dicen «elige», no «restablece». El servidor no lo mira.
    const invitacion = params.get("invitacion") === "1";
    const reset = useResetPassword(token, invitacion);

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    // AUD-014 — sin enlace, o con uno que el servidor ya no acepta, no hay formulario que valga:
    // la tarjeta lo dice y lleva a pedir otro. Una invitación caducada no se pide desde aquí
    // (la reenvía un administrador), así que su salida es otra.
    if (!token || codigoDeError(reset.error) === "INVALID_OR_EXPIRED_TOKEN") {
        return invitacion ? (
            <EnlaceCaducado pedirOtro="/auth/login" textoPedirOtro={t("auth.volverAlLogin")} explicacion={t("auth.enlace.invitacion")} />
        ) : (
            <EnlaceCaducado pedirOtro="/auth/forgot-password" textoPedirOtro={t("auth.enlace.pedirRestablecer")} explicacion={t("auth.enlace.restablecer")} />
        );
    }

    return (
        <MarcoDeAcceso
            titulo={t(invitacion ? "auth.invitacion.titulo" : "ruta.nuevaContrasena")}
            subtitulo={t(invitacion ? "auth.invitacion.subtitulo" : "auth.restablecer.subtitulo")}
        >
            {reset.isError && (
                <AvisoDeAcceso>
                    <p>{mensajeDeError(idioma, reset.error)}</p>
                </AvisoDeAcceso>
            )}

            <form noValidate onSubmit={handleSubmit((data) => reset.mutate(data))} className="space-y-4">
                <CampoDeContrasena
                    id="password"
                    label={t("auth.campo.nuevaContrasena")}
                    autoComplete="new-password"
                    autoFocus
                    ayuda={t("auth.ejemplo.minimo")}
                    error={te(errors.password?.message)}
                    {...register("password")}
                />
                <CampoDeContrasena
                    id="passwordConfirmation"
                    label={t("auth.campo.confirmar")}
                    autoComplete="new-password"
                    error={te(errors.passwordConfirmation?.message)}
                    {...register("passwordConfirmation")}
                />
                <Button type="submit" className="w-full" isLoading={reset.isPending}>
                    {t(invitacion ? "auth.invitacion.boton" : "auth.restablecer.boton")}
                </Button>
            </form>
        </MarcoDeAcceso>
    );
}
