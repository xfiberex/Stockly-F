import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import type { UseMutationResult } from "@tanstack/react-query";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { hayPunteroFino } from "@/shared/lib/punteroFino";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO } from "@/shared/lib/clasesDeMarco";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { AvisoDeAcceso, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import { useEstadoDeAcceso, type EstadoDeAcceso } from "@/modules/auth/lib/estadoDeAcceso";

/**
 * AUD-014 — pedir un enlace por correo: el de restablecer la contraseña o el de confirmar la
 * cuenta. Las dos responden lo mismo exista o no la cuenta (no se revela quién está
 * registrado), así que el éxito es una frase neutra. Hecho, el foco va a esa frase: antes se
 * quedaba en `<body>` cuando el formulario desaparecía con el botón que lo tenía.
 *
 * La frase dice **a qué dirección** se mandó (una errata se ve ahí), con la pista del spam y
 * «Usar otro correo», que vuelve al formulario. El correo llega ya escrito si se venía del login,
 * y vuelve a él.
 */
export function PedirEnlacePorCorreo({
    titulo,
    subtitulo,
    boton,
    enviado,
    pedir,
}: {
    titulo: string;
    subtitulo: string;
    boton: string;
    /** La frase de hecho; recibe la dirección. */
    enviado: (correo: string) => string;
    pedir: UseMutationResult<unknown, Error, string>;
}) {
    const { t, te, idioma } = useT();
    const { correo } = useEstadoDeAcceso();
    const { register, control, handleSubmit, setFocus, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: correo ?? "" },
    });
    const confirmacion = useRef<HTMLParagraphElement>(null);
    const volviendo = useRef(false);

    useEffect(() => {
        if (pedir.isSuccess) {
            confirmacion.current?.focus();
        } else if (volviendo.current) {
            // «Usar otro correo»: de vuelta al campo, que conserva lo escrito para corregirlo.
            volviendo.current = false;
            setFocus("email", { shouldSelect: true });
        }
    }, [pedir.isSuccess, setFocus]);

    const usarOtro = () => {
        volviendo.current = true;
        pedir.reset();
    };
    const escrito = useWatch({ control, name: "email" });
    const alLogin = (): EstadoDeAcceso => ({ correo: escrito || undefined });

    return (
        // Hecho, sin subtítulo: «Te enviaremos…» ya no es verdad, y la frase de abajo dice lo que pasó.
        <MarcoDeAcceso titulo={titulo} subtitulo={pedir.isSuccess ? undefined : subtitulo}>
            {pedir.isSuccess ? (
                <div className="space-y-3 text-center">
                    <div role="status" className="space-y-2">
                        <CheckCircleIcon aria-hidden="true" className="mx-auto h-8 w-8 text-success" />
                        <p ref={confirmacion} tabIndex={-1} className="text-sm text-foreground outline-none">
                            {enviado(escrito)}
                        </p>
                    </div>
                    <p className="text-sm text-foreground-muted">{t("auth.enviado.spam")}</p>
                    <button type="button" onClick={usarOtro} className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "text-sm")}>
                        {t("auth.enviado.otroCorreo")}
                    </button>
                </div>
            ) : (
                <>
                    {pedir.isError && (
                        <AvisoDeAcceso>
                            <p>{mensajeDeError(idioma, pedir.error)}</p>
                        </AvisoDeAcceso>
                    )}
                    <form noValidate onSubmit={handleSubmit((data) => pedir.mutate(data.email))} className="space-y-4">
                        <Input
                            id="email"
                            label={t("auth.campo.correo")}
                            type="email"
                            autoComplete="email"
                            // Solo con ratón: en el móvil, el teclado tapaba lo que la pantalla explica.
                            autoFocus={hayPunteroFino()}
                            anunciarError={false}
                            error={te(errors.email?.message)}
                            {...register("email")}
                        />
                        <Button type="submit" className="w-full" isLoading={pedir.isPending}>
                            {boton}
                        </Button>
                    </form>
                </>
            )}

            {/* Hecho, volver es lo siguiente: botón, por encima de «Usar otro correo». Antes eran dos
                enlaces iguales y ninguno parecía el camino. */}
            {pedir.isSuccess ? (
                <Link to="/auth/login" state={alLogin()} className={cn(clasesDeBoton("secondary"), "w-full")}>
                    {t("auth.volverAlLogin")}
                </Link>
            ) : (
                <p className="text-center text-sm">
                    <Link to="/auth/login" state={alLogin()} className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO)}>
                        {t("auth.volverAlLogin")}
                    </Link>
                </p>
            )}
        </MarcoDeAcceso>
    );
}
