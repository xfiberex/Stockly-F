import { useForm, useWatch } from "react-hook-form";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { CODIGO_FUENTE } from "@/shared/lib/codigoFuente";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
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
    const { t, te } = useT();
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
        <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.perfil")}</h1>
                <p className="text-sm text-foreground-muted mt-1">{t("auth.perfil.subtitulo")}</p>
            </div>

            {/* Datos personales */}
            <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">{t("auth.perfil.datos")}</h2>
                <form
                    onSubmit={profileForm.handleSubmit((data) => updateProfile.mutate(data))}
                    className="space-y-4"
                >
                    <Input
                        id="name"
                        label={t("comun.nombre")}
                        placeholder={t("auth.ejemplo.nombre")}
                        error={te(profileForm.formState.errors.name?.message)}
                        {...profileForm.register("name")}
                    />
                    <Input
                        id="email"
                        label={t("auth.campo.correo")}
                        type="email"
                        placeholder={t("auth.ejemplo.correo")}
                        error={te(profileForm.formState.errors.email?.message)}
                        {...profileForm.register("email")}
                    />
                    {emailChanged && (
                        <p className="text-xs text-warning bg-warning-surface border border-warning rounded-lg px-3 py-2">
                            {t("auth.perfil.avisoCorreo")}
                        </p>
                    )}
                    <div className="flex justify-end">
                        <Button type="submit" isLoading={updateProfile.isPending}>
                            {t("comun.guardarCambios")}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Cambio de contraseña */}
            <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">{t("auth.perfil.cambiarContrasena")}</h2>
                <p className="text-sm text-foreground-muted">
                    {t("auth.perfil.avisoContrasena")}
                </p>
                <form
                    onSubmit={passwordForm.handleSubmit((data) => updatePassword.mutate(data))}
                    className="space-y-4"
                >
                    <Input
                        id="currentPassword"
                        label={t("auth.campo.contrasenaActual")}
                        type="password"
                        autoComplete="current-password"
                        placeholder={t("auth.ejemplo.contrasenaActual")}
                        error={te(passwordForm.formState.errors.currentPassword?.message)}
                        {...passwordForm.register("currentPassword")}
                    />
                    <Input
                        id="password"
                        label={t("auth.campo.nuevaContrasena")}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("auth.ejemplo.minimo")}
                        error={te(passwordForm.formState.errors.password?.message)}
                        {...passwordForm.register("password")}
                    />
                    <Input
                        id="passwordConfirmation"
                        label={t("auth.campo.confirmarNueva")}
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("auth.ejemplo.repiteNueva")}
                        error={te(passwordForm.formState.errors.passwordConfirmation?.message)}
                        {...passwordForm.register("passwordConfirmation")}
                    />
                    <div className="flex justify-end">
                        <Button type="submit" isLoading={updatePassword.isPending}>
                            {t("auth.perfil.cambiarContrasena")}
                        </Button>
                    </div>
                </form>
            </div>

            {/* ADR 0009 — la AGPL pide ofrecer el código a quien usa la aplicación por la red.
                Está aquí porque el perfil lo abre cualquier rol. */}
            <section aria-labelledby="acerca-de" className="bg-surface rounded-xl border border-border p-6 space-y-3">
                <h2 id="acerca-de" className="text-base font-semibold text-foreground">{t("acerca.titulo")}</h2>
                <p className="text-sm text-foreground-muted">{t("acerca.licencia")}</p>
                <ul className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
                    {([
                        ["acerca.codigoBackend", CODIGO_FUENTE.backend],
                        ["acerca.codigoFrontend", CODIGO_FUENTE.frontend],
                        ["acerca.textoLicencia", CODIGO_FUENTE.licencia],
                        ["acerca.avisos", "/AVISOS-DE-TERCEROS.txt"],
                    ] as const).map(([clave, url]) => (
                        <li key={clave}>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-1 font-medium text-info hover:underline md:min-h-0"
                            >
                                {t(clave)}
                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </a>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
