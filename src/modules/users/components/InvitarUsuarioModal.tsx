import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { rolSchema } from "@/shared/contratos";
import type { InvitacionForm } from "@/modules/users/types/users.types";

// Los mensajes son claves del catálogo (T4-04); ver `auth.schema.ts`. Las reglas son las de
// `users.validator.ts` del backend, y el rol sale del contrato.
const invitacionSchema = z.object({
    name: z.string().trim()
        .min(1, "validacion.nombreRequerido" satisfies Clave)
        .max(80, "validacion.maximo80" satisfies Clave),
    email: z.string().trim().email("validacion.correoInvalido" satisfies Clave),
    role: rolSchema,
});

interface InvitarUsuarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    roles: ReadonlyArray<{ value: string; label: string }>;
    onSubmit: (form: InvitacionForm) => void;
    isPending: boolean;
}

/**
 * T6-10 — alta por invitación. **No pide contraseña**: la persona la elige con el enlace que
 * le llega por correo. El rol empieza en `USER`, el de menos alcance.
 */
export function InvitarUsuarioModal({ isOpen, onClose, roles, onSubmit, isPending }: InvitarUsuarioModalProps) {
    const { t, te } = useT();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<InvitacionForm>({
        resolver: zodResolver(invitacionSchema),
        defaultValues: { name: "", email: "", role: "USER" },
    });

    const handleClose = () => { reset(); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t("usuarios.invitar")} className="max-w-md">
            {/* `noValidate`: ver `CustomerFormModal`. */}
            <form onSubmit={handleSubmit((valores) => onSubmit(valores))} noValidate className="flex flex-col gap-4">
                <Input
                    id="invitacion-nombre"
                    label={`${t("comun.nombre")} *`}
                    placeholder={t("usuarios.invitar.ejemploNombre")}
                    autoComplete="off"
                    maxLength={80}
                    error={te(errors.name?.message)}
                    {...register("name")}
                />
                <Input
                    id="invitacion-correo"
                    label={`${t("auth.campo.correo")} *`}
                    type="email"
                    placeholder={t("usuarios.invitar.ejemploCorreo")}
                    autoComplete="off"
                    aria-describedby="invitacion-ayuda"
                    error={te(errors.email?.message)}
                    {...register("email")}
                />
                <Select
                    id="invitacion-rol"
                    label={t("usuarios.columna.rol")}
                    options={roles}
                    {...register("role")}
                />
                <p id="invitacion-ayuda" className="text-xs text-foreground-muted">{t("usuarios.invitar.ayuda")}</p>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={isPending}>{t("usuarios.invitar.enviar")}</Button>
                </div>
            </form>
        </Modal>
    );
}
