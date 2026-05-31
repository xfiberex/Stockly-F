import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useUpdateProfile } from "@/modules/auth/hooks/useUpdateProfile";
import { useUpdatePassword } from "@/modules/auth/hooks/useUpdatePassword";
import {
    updateProfileSchema,
    updatePasswordSchema,
    type UpdateProfileForm,
    type UpdatePasswordForm,
} from "@/modules/auth/schemas/auth.schema";

export default function ProfilePage() {
    const { user } = useAuth();
    const updateProfile = useUpdateProfile();
    const updatePassword = useUpdatePassword();

    const profileForm = useForm<UpdateProfileForm>({
        resolver: zodResolver(updateProfileSchema),
        values: { name: user?.name ?? "", email: user?.email ?? "" },
    });

    const watchedEmail = useWatch({ control: profileForm.control, name: "email" });
    const emailChanged = !!user?.email && watchedEmail !== user.email;

    const passwordForm = useForm<UpdatePasswordForm>({
        resolver: zodResolver(updatePasswordSchema),
        defaultValues: { currentPassword: "", password: "", passwordConfirmation: "" },
    });

    return (
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
                <p className="text-sm text-gray-500 mt-1">Administra tu información personal</p>
            </div>

            {/* Datos personales */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h2 className="text-base font-semibold text-gray-900">Datos personales</h2>
                <form
                    onSubmit={profileForm.handleSubmit((data) => updateProfile.mutate(data))}
                    className="space-y-4"
                >
                    <Input
                        id="name"
                        label="Nombre"
                        placeholder="Tu nombre"
                        error={profileForm.formState.errors.name?.message}
                        {...profileForm.register("name")}
                    />
                    <Input
                        id="email"
                        label="Correo electrónico"
                        type="email"
                        placeholder="usuario@email.com"
                        error={profileForm.formState.errors.email?.message}
                        {...profileForm.register("email")}
                    />
                    {emailChanged && (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Al cambiar tu correo cerrarás sesión en todos los dispositivos y deberás verificar el nuevo correo antes de poder iniciar sesión.
                        </p>
                    )}
                    <div className="flex justify-end">
                        <Button type="submit" isLoading={updateProfile.isPending}>
                            Guardar cambios
                        </Button>
                    </div>
                </form>
            </div>

            {/* Cambio de contraseña */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <h2 className="text-base font-semibold text-gray-900">Cambiar contraseña</h2>
                <p className="text-sm text-gray-500">
                    Al cambiar tu contraseña cerrarás sesión en todos los dispositivos.
                </p>
                <form
                    onSubmit={passwordForm.handleSubmit((data) => updatePassword.mutate(data))}
                    className="space-y-4"
                >
                    <Input
                        id="currentPassword"
                        label="Contraseña actual"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Tu contraseña actual"
                        error={passwordForm.formState.errors.currentPassword?.message}
                        {...passwordForm.register("currentPassword")}
                    />
                    <Input
                        id="password"
                        label="Nueva contraseña"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        error={passwordForm.formState.errors.password?.message}
                        {...passwordForm.register("password")}
                    />
                    <Input
                        id="passwordConfirmation"
                        label="Confirmar nueva contraseña"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repite tu nueva contraseña"
                        error={passwordForm.formState.errors.passwordConfirmation?.message}
                        {...passwordForm.register("passwordConfirmation")}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" isLoading={updatePassword.isPending}>
                            Cambiar contraseña
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
