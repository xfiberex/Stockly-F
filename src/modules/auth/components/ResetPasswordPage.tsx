import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { resetPasswordSchema, type ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useResetPassword } from "@/modules/auth/hooks/useResetPassword";
import { CLASES_MARCO_CENTRADO } from "@/shared/lib/clasesDeMarco";

export default function ResetPasswordPage() {
    const { t, te } = useT();
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    // T6-10 — el enlace de una invitación llega aquí con `invitacion=1`. Quien lo abre no ha
    // olvidado nada: los textos dicen «elige», no «restablece». El servidor no lo mira.
    const invitacion = params.get("invitacion") === "1";
    const reset = useResetPassword(token, invitacion);

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    if (!token) {
        return (
            <main className={CLASES_MARCO_CENTRADO}>
                <p className="text-danger">{t("auth.restablecer.sinToken")}</p>
            </main>
        );
    }

    return (
        <main className={CLASES_MARCO_CENTRADO}>
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-raised p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">{t(invitacion ? "auth.invitacion.titulo" : "ruta.nuevaContrasena")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t(invitacion ? "auth.invitacion.subtitulo" : "auth.restablecer.subtitulo")}</p>
                </div>

                <form onSubmit={handleSubmit((data) => reset.mutate(data))} className="space-y-4">
                    <Input
                        id="password"
                        label={t("auth.campo.nuevaContrasena")}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("auth.ejemplo.minimo")}
                        error={te(errors.password?.message)}
                        {...register("password")}
                    />
                    <Input
                        id="passwordConfirmation"
                        label={t("auth.campo.confirmar")}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("auth.ejemplo.repite")}
                        error={te(errors.passwordConfirmation?.message)}
                        {...register("passwordConfirmation")}
                    />
                    <Button type="submit" className="w-full" isLoading={reset.isPending}>
                        {t(invitacion ? "auth.invitacion.boton" : "auth.restablecer.boton")}
                    </Button>
                </form>
            </div>
        </main>
    );
}
