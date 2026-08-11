import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useResendVerification } from "@/modules/auth/hooks/useResendVerification";

export default function ResendVerificationPage() {
    const { t, te } = useT();
    const resend = useResendVerification();
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-raised p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">{t("ruta.reenviarVerificacion")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">
                        {t("auth.reenviar.subtitulo")}
                    </p>
                </div>

                {resend.isSuccess ? (
                    <p className="text-center text-sm text-success">
                        {t("auth.reenviar.enviado")}
                    </p>
                ) : (
                    <form
                        onSubmit={handleSubmit((data) => resend.mutate(data.email))}
                        className="space-y-4"
                    >
                        <Input
                            id="email"
                            label={t("auth.campo.correo")}
                            type="email"
                            placeholder={t("auth.ejemplo.correo")}
                            error={te(errors.email?.message)}
                            {...register("email")}
                        />
                        <Button type="submit" className="w-full" isLoading={resend.isPending}>
                            {t("auth.reenviar.boton")}
                        </Button>
                    </form>
                )}

                <p className="text-center text-sm text-foreground-muted">
                    <Link to="/auth/login" className="text-info hover:underline">
                        {t("auth.volverAlLogin")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
