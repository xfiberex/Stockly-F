import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { resetPasswordSchema, type ResetPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useResetPassword } from "@/modules/auth/hooks/useResetPassword";

export default function ResetPasswordPage() {
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const reset = useResetPassword(token);

    const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
        resolver: zodResolver(resetPasswordSchema),
    });

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <p className="text-red-600">Token inválido. Solicita un nuevo enlace.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900">Nueva contraseña</h1>
                    <p className="text-sm text-gray-500 mt-1">Elige una contraseña segura</p>
                </div>

                <form onSubmit={handleSubmit((data) => reset.mutate(data))} className="space-y-4">
                    <Input
                        id="password"
                        label="Nueva contraseña"
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
                    <Button type="submit" className="w-full" isLoading={reset.isPending}>
                        Restablecer contraseña
                    </Button>
                </form>
            </div>
        </div>
    );
}
