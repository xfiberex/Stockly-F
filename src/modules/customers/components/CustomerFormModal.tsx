import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import type { Customer, CustomerForm } from "@/modules/customers/types/customer.types";
import { LARGO_MAXIMO_DE_DOCUMENTO } from "@/shared/contratos";

// Los mensajes son claves del catálogo (T4-04); ver `auth.schema.ts`.
const customerSchema = z.object({
    name: z.string().trim()
        .min(1, "validacion.nombreRequerido" satisfies Clave)
        .max(200, "validacion.maximo200" satisfies Clave),
    email: z.union([
        z.string().trim().email("validacion.correoInvalido" satisfies Clave),
        z.literal(""),
    ]),
    phone: z.string().trim().max(30, "validacion.maximo30" satisfies Clave),
    // T6-06 — el tope es el del contrato, el mismo que aplica el servidor.
    document: z.string().trim().max(LARGO_MAXIMO_DE_DOCUMENTO, "validacion.maximo40" satisfies Clave),
    notes: z.string().trim().max(1000, "validacion.maximo1000" satisfies Clave),
});

type Valores = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer?: Customer;
    onSubmit: (form: CustomerForm) => void;
    isPending: boolean;
}

/**
 * Alta y edición. **Se mandan los cinco campos siempre**, vacíos incluidos: en la edición el
 * servidor borra un campo que llega vacío, y es la forma de quitarle el teléfono a un cliente.
 * Omitirlos lo dejaría como estaba.
 */
export function CustomerFormModal({ isOpen, onClose, customer, onSubmit, isPending }: CustomerFormModalProps) {
    const { t, te } = useT();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<Valores>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: customer?.name ?? "",
            email: customer?.email ?? "",
            phone: customer?.phone ?? "",
            document: customer?.document ?? "",
            notes: customer?.notes ?? "",
        },
    });

    const handleClose = () => { reset(); onClose(); };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={customer ? t("clientes.editar") : t("clientes.nuevo")}
            className="max-w-md"
        >
            {/* `noValidate`: con `type="email"`, la validación nativa frena el envío con su propio
                aviso, en el idioma del navegador (T4-04), y el mensaje traducido del esquema no
                llega a verse. El teclado de correo del móvil se conserva. */}
            <form onSubmit={handleSubmit((valores) => onSubmit(valores))} noValidate className="flex flex-col gap-4">
                <Input
                    id="customer-name"
                    label={`${t("comun.nombre")} *`}
                    placeholder={t("clientes.ejemploNombre")}
                    error={te(errors.name?.message)}
                    {...register("name")}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                        id="customer-email"
                        label={t("clientes.correo")}
                        type="email"
                        placeholder={t("clientes.ejemploCorreo")}
                        aria-describedby="customer-email-ayuda"
                        error={te(errors.email?.message)}
                        {...register("email")}
                    />
                    <Input
                        id="customer-phone"
                        label={t("clientes.telefono")}
                        type="tel"
                        placeholder={t("clientes.ejemploTelefono")}
                        error={te(errors.phone?.message)}
                        {...register("phone")}
                    />
                </div>
                <p id="customer-email-ayuda" className="-mt-2 text-xs text-foreground-muted">{t("clientes.correoAyuda")}</p>
                {/* T6-06 — texto libre: cada país llama y escribe el suyo a su manera. */}
                <Input
                    id="customer-document"
                    label={t("clientes.documento")}
                    placeholder={t("clientes.ejemploDocumento")}
                    maxLength={LARGO_MAXIMO_DE_DOCUMENTO}
                    autoComplete="off"
                    error={te(errors.document?.message)}
                    {...register("document")}
                />
                <Input
                    id="customer-notes"
                    label={t("clientes.notas")}
                    placeholder={t("clientes.ejemploNotas")}
                    error={te(errors.notes?.message)}
                    {...register("notes")}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={isPending}>{t("comun.guardar")}</Button>
                </div>
            </form>
        </Modal>
    );
}
