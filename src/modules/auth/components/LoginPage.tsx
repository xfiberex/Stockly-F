import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { codigoDeError, mensajeDeError } from "@/shared/lib/errorApi";
import { loginFormSchema, type LoginForm } from "@/modules/auth/schemas/auth.schema";
import { useLogin } from "@/modules/auth/hooks/useLogin";
import { AvisoDeAcceso, CampoDeContrasena, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { useEstadoDeAcceso, type EstadoDeAcceso } from "@/modules/auth/lib/estadoDeAcceso";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO } from "@/shared/lib/clasesDeMarco";

export default function LoginPage() {
    const { t, te, idioma } = useT();
    const login = useLogin();
    // AUD-014 — el correo que ya se escribió en otra pantalla de acceso, y si se llega con la
    // contraseña recién guardada.
    const { correo, aviso } = useEstadoDeAcceso();
    const { register, control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginFormSchema),
        defaultValues: { email: correo ?? "" },
    });
    const codigo = codigoDeError(login.error);
    // Lo escrito en «Correo» viaja a «¿Olvidaste…?» y a «Reenviar». `useWatch` y no `getValues`: el
    // enlace se pinta antes de escribir y tiene que llevar lo último.
    const escrito = useWatch({ control, name: "email" });
    const conCorreo = (): EstadoDeAcceso => ({ correo: escrito || undefined });

    return (
        <MarcoDeAcceso titulo={t("ruta.login")} subtitulo={t("auth.login.subtitulo")}>
            {/* AUD-014 — el motivo del servidor se queda en la tarjeta hasta el siguiente intento.
                Y lo que tiene salida —confirmar el correo, una contraseña olvidada— dice cuál. */}
            {login.isError ? (
                <AvisoDeAcceso>
                    <p>{mensajeDeError(idioma, login.error)}</p>
                    {codigo === "EMAIL_NOT_CONFIRMED" && (
                        <Link to="/auth/resend-verification" state={conCorreo()} className={cn(CLASES_ENLACE_EN_TEXTO, "mt-1 inline-block")}>
                            {t("auth.login.reenviarEnlace")}
                        </Link>
                    )}
                    {codigo === "INVALID_CREDENTIALS" && (
                        <Link to="/auth/forgot-password" state={conCorreo()} className={cn(CLASES_ENLACE_EN_TEXTO, "mt-1 inline-block")}>
                            {t("auth.login.olvidaste")}
                        </Link>
                    )}
                </AvisoDeAcceso>
            ) : (
                aviso && (
                    <AvisoDeAcceso tono="exito">
                        <p>{t(aviso === "invitacionGuardada" ? "auth.login.invitacionGuardada" : "auth.login.restablecida")}</p>
                    </AvisoDeAcceso>
                )
            )}

            {/* `noValidate`: la validación es la de Zod, en el idioma de la interfaz. Sin esto,
                el navegador sacaba además su burbuja para el `type="email"`. */}
            <form noValidate onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
                <Input
                    id="email"
                    label={t("auth.campo.correo")}
                    type="email"
                    autoComplete="email"
                    autoFocus={!correo}
                    placeholder={t("auth.ejemplo.correo")}
                    error={te(errors.email?.message)}
                    {...register("email")}
                />
                <CampoDeContrasena
                    id="password"
                    label={t("auth.campo.contrasena")}
                    autoComplete="current-password"
                    // Con el correo ya puesto, lo que falta es la contraseña.
                    autoFocus={!!correo}
                    error={te(errors.password?.message)}
                    {...register("password")}
                />

                <div className="text-right">
                    <Link to="/auth/forgot-password" state={conCorreo()} className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "text-sm")}>
                        {t("auth.login.olvidaste")}
                    </Link>
                </div>

                <Button type="submit" className="w-full" isLoading={login.isPending}>
                    {t("auth.login.entrar")}
                </Button>
            </form>

            {/* AUD-014 — «¿No recibiste el correo de verificación?» ya no va aquí para todos: sale en
                el aviso cuando el servidor dice que falta confirmar, y tras registrarse. */}
            <p className="text-center text-sm text-foreground-muted">
                {t("auth.login.sinCuenta")}{" "}
                <Link to="/auth/register" className={cn(CLASES_ENLACE_EN_TEXTO, "font-medium")}>
                    {t("auth.login.registrate")}
                </Link>
            </p>
        </MarcoDeAcceso>
    );
}
