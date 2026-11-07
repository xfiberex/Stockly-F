import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import type { UseMutationResult } from "@tanstack/react-query";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { CLASES_ENLACE_EN_TEXTO } from "@/shared/lib/clasesDeMarco";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { AvisoDeAcceso, MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";

/**
 * AUD-014 — pedir un enlace por correo: el de restablecer la contraseña o el de confirmar la
 * cuenta. Las dos responden lo mismo exista o no la cuenta (no se revela quién está
 * registrado), así que el éxito es una frase neutra. Hecho, el foco va a esa frase: antes se
 * quedaba en `<body>` cuando el formulario desaparecía con el botón que lo tenía.
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
    enviado: string;
    pedir: UseMutationResult<unknown, Error, string>;
}) {
    const { t, te, idioma } = useT();
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });
    const confirmacion = useRef<HTMLParagraphElement>(null);

    useEffect(() => {
        if (pedir.isSuccess) confirmacion.current?.focus();
    }, [pedir.isSuccess]);

    return (
        <MarcoDeAcceso titulo={titulo} subtitulo={subtitulo}>
            {pedir.isSuccess ? (
                <div role="status" className="space-y-2 text-center">
                    <CheckCircleIcon aria-hidden="true" className="mx-auto h-8 w-8 text-success" />
                    <p ref={confirmacion} tabIndex={-1} className="text-sm text-foreground outline-none">{enviado}</p>
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
                            autoFocus
                            placeholder={t("auth.ejemplo.correo")}
                            error={te(errors.email?.message)}
                            {...register("email")}
                        />
                        <Button type="submit" className="w-full" isLoading={pedir.isPending}>
                            {boton}
                        </Button>
                    </form>
                </>
            )}

            <p className="text-center text-sm">
                <Link to="/auth/login" className={CLASES_ENLACE_EN_TEXTO}>
                    {t("auth.volverAlLogin")}
                </Link>
            </p>
        </MarcoDeAcceso>
    );
}
