import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { codigoDeError, mensajeDeError } from "@/shared/lib/errorApi";
import { loginFormSchema, type LoginForm } from "@/modules/auth/schemas/auth.schema";
import { useLogin } from "@/modules/auth/hooks/useLogin";
import { AvisoDeAcceso, CampoDeContrasena, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_EN_TEXTO } from "@/shared/lib/clasesDeMarco";

export default function LoginPage() {
    const { t, te, idioma } = useT();
    const login = useLogin();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginFormSchema),
    });
    const codigo = codigoDeError(login.error);

    return (
        <MarcoDeAcceso titulo={t("ruta.login")} subtitulo={t("auth.login.subtitulo")}>
            {/* AUD-014 — el motivo del servidor se queda en la tarjeta hasta el siguiente intento.
                Y lo propio de Stockly —confirmar el correo, esperar la aprobación— dice qué hacer. */}
            {login.isError && (
                <AvisoDeAcceso>
                    <p>{mensajeDeError(idioma, login.error)}</p>
                    {codigo === "EMAIL_NOT_CONFIRMED" && (
                        <Link to="/auth/resend-verification" className={cn(CLASES_ENLACE_EN_TEXTO, "mt-1 inline-block")}>
                            {t("auth.login.reenviarEnlace")}
                        </Link>
                    )}
                </AvisoDeAcceso>
            )}

            {/* `noValidate`: la validación es la de Zod, en el idioma de la interfaz. Sin esto,
                el navegador sacaba además su burbuja para el `type="email"`. */}
            <form noValidate onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
                <Input
                    id="email"
                    label={t("auth.campo.correo")}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder={t("auth.ejemplo.correo")}
                    error={te(errors.email?.message)}
                    {...register("email")}
                />
                <CampoDeContrasena
                    id="password"
                    label={t("auth.campo.contrasena")}
                    autoComplete="current-password"
                    error={te(errors.password?.message)}
                    {...register("password")}
                />

                <div className="text-right">
                    <Link to="/auth/forgot-password" className="text-xs text-info hover:underline">
                        {t("auth.login.olvidaste")}
                    </Link>
                </div>

                <Button type="submit" className="w-full" isLoading={login.isPending}>
                    {t("auth.login.entrar")}
                </Button>
            </form>

            <p className="text-center text-sm text-foreground-muted">
                {t("auth.login.sinCuenta")}{" "}
                <Link to="/auth/register" className={cn(CLASES_ENLACE_EN_TEXTO, "font-medium")}>
                    {t("auth.login.registrate")}
                </Link>
            </p>

            <p className="text-center text-xs text-foreground-muted">
                {t("auth.login.sinCorreo")}{" "}
                <Link to="/auth/resend-verification" className={CLASES_ENLACE_EN_TEXTO}>
                    {t("auth.login.reenviar")}
                </Link>
            </p>
        </MarcoDeAcceso>
    );
}
