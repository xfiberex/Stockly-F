import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useForgotPassword } from "@/modules/auth/hooks/useForgotPassword";
import { CLASES_MARCO_CENTRADO } from "@/shared/lib/clasesDeMarco";

export default function ForgotPasswordPage() {
    const { t, te } = useT();
    const forgot = useForgotPassword();
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    return (
        <main className={CLASES_MARCO_CENTRADO}>
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-raised p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">{t("ruta.recuperar")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">
                        {t("auth.recuperar.subtitulo")}
                    </p>
                </div>

                {forgot.isSuccess ? (
                    <p className="text-center text-sm text-success">
                        {t("auth.recuperar.enviado")}
                    </p>
                ) : (
                    <form onSubmit={handleSubmit((data) => forgot.mutate(data))} className="space-y-4">
                        <Input
                            id="email"
                            label={t("auth.campo.correo")}
                            type="email"
                            placeholder={t("auth.ejemplo.correo")}
                            error={te(errors.email?.message)}
                            {...register("email")}
                        />
                        <Button type="submit" className="w-full" isLoading={forgot.isPending}>
                            {t("auth.recuperar.enviar")}
                        </Button>
                    </form>
                )}

                <p className="text-center text-sm text-foreground-muted">
                    <Link to="/auth/login" className="text-info hover:underline">
                        {t("auth.volverAlLogin")}
                    </Link>
                </p>
            </div>
        </main>
    );
}
