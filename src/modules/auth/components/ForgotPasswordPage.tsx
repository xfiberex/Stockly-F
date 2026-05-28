import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { forgotPasswordSchema, type ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";
import { useForgotPassword } from "@/modules/auth/hooks/useForgotPassword";

export default function ForgotPasswordPage() {
    const forgot = useForgotPassword();
    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900">Recuperar contraseña</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Te enviaremos instrucciones por correo
                    </p>
                </div>

                {forgot.isSuccess ? (
                    <p className="text-center text-sm text-green-600">
                        Si el correo existe, recibirás instrucciones en tu bandeja.
                    </p>
                ) : (
                    <form onSubmit={handleSubmit((data) => forgot.mutate(data))} className="space-y-4">
                        <Input
                            id="email"
                            label="Correo electrónico"
                            type="email"
                            placeholder="usuario@email.com"
                            error={errors.email?.message}
                            {...register("email")}
                        />
                        <Button type="submit" className="w-full" isLoading={forgot.isPending}>
                            Enviar instrucciones
                        </Button>
                    </form>
                )}

                <p className="text-center text-sm text-gray-500">
                    <Link to="/auth/login" className="text-blue-600 hover:underline">
                        Volver al inicio de sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}
