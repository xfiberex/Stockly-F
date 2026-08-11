import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { loginFormSchema, type LoginForm } from "@/modules/auth/schemas/auth.schema";
import { useLogin } from "@/modules/auth/hooks/useLogin";

export default function LoginPage() {
    const { t, te } = useT();
    const login = useLogin();
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
        resolver: zodResolver(loginFormSchema),
    });

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-raised p-8 space-y-6">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="rounded-xl bg-primary p-2">
                            <CubeIcon className="h-6 w-6 text-surface" />
                        </div>
                        {/* El nombre del producto no se traduce. */}
                        <span className="text-2xl font-bold text-foreground">Stockly</span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground">{t("ruta.login")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("auth.login.subtitulo")}</p>
                </div>

                <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
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
                        autoComplete="current-password"
                        placeholder={t("auth.ejemplo.contrasena")}
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
                    <Link to="/auth/register" className="text-info hover:underline font-medium">
                        {t("auth.login.registrate")}
                    </Link>
                </p>

                <p className="text-center text-xs text-foreground-muted">
                    {t("auth.login.sinCorreo")}{" "}
                    <Link to="/auth/resend-verification" className="text-info hover:underline">
                        {t("auth.login.reenviar")}
                    </Link>
                </p>
            </div>
        </div>
    );
}
