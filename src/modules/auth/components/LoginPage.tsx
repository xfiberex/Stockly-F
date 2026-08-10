import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { loginFormSchema, type LoginForm } from "@/modules/auth/schemas/auth.schema";
import { useLogin } from "@/modules/auth/hooks/useLogin";

export default function LoginPage() {
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
                        <span className="text-2xl font-bold text-foreground">Stockly</span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground">Iniciar sesión</h1>
                    <p className="text-sm text-foreground-muted mt-1">Accede a tu cuenta Stockly</p>
                </div>

                <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
                    <Input
                        id="email"
                        label="Correo electrónico"
                        type="email"
                        autoComplete="email"
                        placeholder="usuario@email.com"
                        error={errors.email?.message}
                        {...register("email")}
                    />
                    <Input
                        id="password"
                        label="Contraseña"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        error={errors.password?.message}
                        {...register("password")}
                    />

                    <div className="text-right">
                        <Link to="/auth/forgot-password" className="text-xs text-info hover:underline">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <Button type="submit" className="w-full" isLoading={login.isPending}>
                        Entrar
                    </Button>
                </form>

                <p className="text-center text-sm text-foreground-muted">
                    ¿No tienes cuenta?{" "}
                    <Link to="/auth/register" className="text-info hover:underline font-medium">
                        Regístrate
                    </Link>
                </p>

                <p className="text-center text-xs text-foreground-muted">
                    ¿No recibiste el correo de verificación?{" "}
                    <Link to="/auth/resend-verification" className="text-info hover:underline">
                        Reenvíalo
                    </Link>
                </p>
            </div>
        </div>
    );
}
