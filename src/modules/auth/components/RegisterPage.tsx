import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { registerFormSchema, type RegisterForm } from "@/modules/auth/schemas/auth.schema";
import { useRegister } from "@/modules/auth/hooks/useRegister";
import { cn } from "@/shared/lib/cn";
import { CLASES_MARCO_CENTRADO, CLASES_ENLACE_EN_TEXTO } from "@/shared/lib/clasesDeMarco";

export default function RegisterPage() {
    const { t, te } = useT();
    const registerMutation = useRegister();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerFormSchema),
    });

    return (
        <main className={CLASES_MARCO_CENTRADO}>
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-raised p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">{t("ruta.registro")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("auth.registro.subtitulo")}</p>
                </div>

                <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                    <Input
                        id="name"
                        label={t("comun.nombre")}
                        autoComplete="name"
                        placeholder={t("auth.ejemplo.nombre")}
                        error={te(errors.name?.message)}
                        {...register("name")}
                    />
                    <Input
                        id="email"
                        label={t("auth.campo.correo")}
                        type="email"
                        autoComplete="email"
                        placeholder={t("auth.ejemplo.correo")}
                        error={te(errors.email?.message)}
                        {...register("email")}
                    />
                    <Input
                        id="password"
                        label={t("auth.campo.contrasena")}
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

                    <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
                        {t("ruta.registro")}
                    </Button>
                </form>

                <p className="text-center text-sm text-foreground-muted">
                    {t("auth.registro.yaTienes")}{" "}
                    <Link to="/auth/login" className={cn(CLASES_ENLACE_EN_TEXTO, "font-medium")}>
                        {t("auth.registro.inicia")}
                    </Link>
                </p>
            </div>
        </main>
    );
}
