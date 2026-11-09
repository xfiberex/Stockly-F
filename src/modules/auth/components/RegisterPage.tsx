import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { hayPunteroFino } from "@/shared/lib/punteroFino";
import { registerFormSchema, type RegisterForm } from "@/modules/auth/schemas/auth.schema";
import { useRegister } from "@/modules/auth/hooks/useRegister";
import { AvisoDeAcceso, CampoDeContrasena, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO } from "@/shared/lib/clasesDeMarco";
import type { EstadoDeAcceso } from "@/modules/auth/lib/estadoDeAcceso";

/**
 * AUD-014 — registrarse en Stockly no da acceso: hay que confirmar el correo y que un
 * administrador apruebe la cuenta (AUD-001). La pantalla lo dice **antes** de enviar, y después
 * se queda en «Revisa tu correo» con lo que falta, en vez de saltar al login con un aviso de 3 s.
 *
 * El servidor responde lo mismo aunque el correo ya tenga cuenta (no revela quién está
 * registrado, como «olvidé la contraseña»); a su dueño le llega un correo que se lo dice.
 */
export default function RegisterPage() {
    const { t, te, idioma } = useT();
    const registro = useRegister();
    const { register, control, handleSubmit, getValues, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerFormSchema),
    });
    const titulo = useRef<HTMLParagraphElement>(null);
    const escrito = useWatch({ control, name: "email" });
    const conCorreo = (): EstadoDeAcceso => ({ correo: escrito || undefined });

    // Hecho, el foco va al mensaje: el formulario desaparece, y con él el botón que lo tenía.
    useEffect(() => {
        if (registro.isSuccess) titulo.current?.focus();
    }, [registro.isSuccess]);

    if (registro.isSuccess) {
        return (
            <MarcoDeAcceso titulo={t("auth.registro.revisaTitulo")}>
                <div role="status" className="space-y-3 text-sm text-foreground">
                    <p ref={titulo} tabIndex={-1} className="outline-none">
                        {t("auth.registro.revisaTexto", { correo: getValues("email") })}
                    </p>
                    <p className="text-foreground-muted">{t("auth.registro.revisaDespues")}</p>
                </div>
                <div className="flex flex-col items-center gap-2 text-sm">
                    <Link to="/auth/login" state={conCorreo()} className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "font-medium")}>{t("auth.volverAlLogin")}</Link>
                    <Link to="/auth/resend-verification" state={conCorreo()} className={cn(CLASES_ENLACE_SUELTO, "text-foreground-muted underline underline-offset-2 hover:no-underline")}>
                        {t("auth.login.sinCorreo")}
                    </Link>
                </div>
            </MarcoDeAcceso>
        );
    }

    return (
        <MarcoDeAcceso titulo={t("ruta.registro")}>
            <div className="rounded-lg bg-surface-muted p-3 text-sm text-foreground">
                <p className="font-medium">{t("auth.registro.pasosTitulo")}</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-foreground-muted">
                    <li>{t("auth.registro.paso1")}</li>
                    <li>{t("auth.registro.paso2")}</li>
                </ol>
            </div>

            {registro.isError && (
                <AvisoDeAcceso>
                    <p>{mensajeDeError(idioma, registro.error)}</p>
                </AvisoDeAcceso>
            )}

            <form noValidate onSubmit={handleSubmit((data) => registro.mutate(data))} className="space-y-4">
                <Input
                    id="name"
                    label={t("comun.nombre")}
                    autoComplete="name"
                    // Solo con ratón: en el móvil, el teclado tapaba los dos pasos de arriba.
                    autoFocus={hayPunteroFino()}
                    anunciarError={false}
                    error={te(errors.name?.message)}
                    {...register("name")}
                />
                <Input
                    id="email"
                    label={t("auth.campo.correo")}
                    type="email"
                    autoComplete="email"
                    anunciarError={false}
                    error={te(errors.email?.message)}
                    {...register("email")}
                />
                <CampoDeContrasena
                    id="password"
                    label={t("auth.campo.contrasena")}
                    autoComplete="new-password"
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

                <Button type="submit" className="w-full" isLoading={registro.isPending}>
                    {t("ruta.registro")}
                </Button>
            </form>

            <p className="text-center text-sm text-foreground-muted">
                {t("auth.registro.yaTienes")}{" "}
                <Link to="/auth/login" state={conCorreo()} className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "font-medium")}>
                    {t("auth.registro.inicia")}
                </Link>
            </p>
        </MarcoDeAcceso>
    );
}
