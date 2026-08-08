import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useResendVerification } from "@/modules/auth/hooks/useResendVerification";

export default function ResendVerificationPage() {
    const resend = useResendVerification();
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-surface rounded-xl border border-border shadow-sm p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-foreground">Reenviar verificación</h1>
                    <p className="text-sm text-foreground-muted mt-1">
                        Te reenviaremos el enlace de confirmación
                    </p>
                </div>

                {resend.isSuccess ? (
                    <p className="text-center text-sm text-success">
                        Correo reenviado. Revisa tu bandeja de entrada.
                    </p>
                ) : (
                    <form
                        onSubmit={handleSubmit((data) => resend.mutate(data.email))}
                        className="space-y-4"
                    >
                        <Input
                            id="email"
                            label="Correo electrónico"
                            type="email"
                            placeholder="usuario@email.com"
                            error={errors.email?.message}
                            {...register("email")}
                        />
                        <Button type="submit" className="w-full" isLoading={resend.isPending}>
                            Reenviar correo
                        </Button>
                    </form>
                )}

                <p className="text-center text-sm text-foreground-muted">
                    <Link to="/auth/login" className="text-info hover:underline">
                        Volver al inicio de sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
