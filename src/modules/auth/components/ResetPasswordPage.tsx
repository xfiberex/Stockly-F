import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import { codigoDeError, mensajeDeError } from "@/shared/lib/errorApi";
import { resetPasswordSchema, type ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useEnlaceDeRestablecer, useResetPassword } from "@/modules/auth/hooks/useResetPassword";
import { AvisoDeAcceso, CampoDeContrasena, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { EnlaceCaducado } from "@/modules/auth/components/EnlaceCaducado";

export default function ResetPasswordPage() {
    const { t, te, idioma } = useT();
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    // T6-10 — el enlace de una invitación llega aquí con `invitacion=1`. Quien lo abre no ha
    // olvidado nada: los textos dicen «elige», no «restablece». El servidor no lo mira.
    const invitacion = params.get("invitacion") === "1";
    const enlace = useEnlaceDeRestablecer(token);
    const correo = enlace.data?.email;
    const reset = useResetPassword(token, invitacion, correo);

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const titulo = t(invitacion ? "auth.invitacion.titulo" : "ruta.nuevaContrasena");

    // AUD-014 — sin enlace, o con uno que el servidor ya no acepta (al abrir o, si caducó
    // mientras se escribía, al enviar), no hay formulario que valga: la tarjeta lo dice y lleva a
    // pedir otro. Una invitación caducada sale por el mismo sitio: la cuenta ya existe, así que
    // «restablecer» le manda un enlace nuevo sin depender de un administrador.
    const caducado = [enlace.error, reset.error].some((e) => codigoDeError(e) === "INVALID_OR_EXPIRED_TOKEN");
    if (!token || caducado) {
        return invitacion ? (
            <EnlaceCaducado pedirOtro="/auth/forgot-password" textoPedirOtro={t("auth.restablecer.boton")} explicacion={t("auth.enlace.invitacion")} />
        ) : (
            <EnlaceCaducado pedirOtro="/auth/forgot-password" textoPedirOtro={t("auth.enlace.pedirRestablecer")} explicacion={t("auth.enlace.restablecer")} />
        );
    }

    if (enlace.isPending) {
        return (
            <MarcoDeAcceso titulo={titulo}>
                <div className="flex justify-center py-4">
                    <Spinner size="lg" />
                </div>
            </MarcoDeAcceso>
        );
    }

    // Si la comprobación falla por otra cosa (sin conexión, un 500), se deja escribir: al enviar,
    // el servidor dirá lo que pase, dentro de la tarjeta.
    return (
        <MarcoDeAcceso
            titulo={titulo}
            subtitulo={t(invitacion ? "auth.invitacion.subtitulo" : "auth.restablecer.subtitulo")}
        >
            {reset.isError && (
                <AvisoDeAcceso>
                    <p>{mensajeDeError(idioma, reset.error)}</p>
                </AvisoDeAcceso>
            )}

            <form noValidate onSubmit={handleSubmit((data) => reset.mutate(data))} className="space-y-4">
                {/* Para el gestor de contraseñas: guarda la nueva con su usuario, no suelta. */}
                {correo && <input type="email" name="username" autoComplete="username" value={correo} readOnly hidden />}
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
