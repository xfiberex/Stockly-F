import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { registerFormSchema, type RegisterForm } from "@/modules/auth/schemas/auth.schema";
import { useRegister } from "@/modules/auth/hooks/useRegister";

export default function RegisterPage() {
    const registerMutation = useRegister();
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
        resolver: zodResolver(registerFormSchema),
    });

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-raised p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">Crear cuenta</h1>
                    <p className="text-sm text-foreground-muted mt-1">Únete a Stockly</p>
                </div>

                <form onSubmit={handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                    <Input
                        id="name"
                        label="Nombre"
                        autoComplete="name"
                        placeholder="Tu nombre"
                        error={errors.name?.message}
                        {...register("name")}
                    />
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
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        error={errors.password?.message}
                        {...register("password")}
                    />
                    <Input
                        id="passwordConfirmation"
                        label="Confirmar contraseña"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repite tu contraseña"
                        error={errors.passwordConfirmation?.message}
                        {...register("passwordConfirmation")}
                    />

                    <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
                        Crear cuenta
                    </Button>
                </form>

                <p className="text-center text-sm text-foreground-muted">
                    ¿Ya tienes cuenta?{" "}
                    <Link to="/auth/login" className="text-info hover:underline font-medium">
                        Inicia sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
