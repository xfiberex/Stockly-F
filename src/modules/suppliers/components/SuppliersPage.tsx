import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/modules/suppliers/hooks/useSupplierMutations";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { Supplier, SupplierForm } from "@/modules/suppliers/types/supplier.types";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { cn } from "@/shared/lib/cn";

// ── Validación ────────────────────────────────────────────────────────────────

// Los mensajes son claves del catálogo (T4-04); ver `auth.schema.ts`.
const supplierSchema = z.object({
    name: z.string().trim()
        .min(1, "validacion.nombreRequerido" satisfies Clave)
        .max(200, "validacion.maximo200" satisfies Clave),
    email: z.union([
        z.string().trim().email("validacion.correoInvalido" satisfies Clave),
        z.literal(""),
    ]).optional(),
    phone: z.string().trim().max(30, "validacion.maximo30" satisfies Clave).optional(),
    notes: z.string().trim().max(1000, "validacion.maximo1000" satisfies Clave).optional(),
});

// ── Modal de formulario ───────────────────────────────────────────────────────

interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier?: Supplier;
    onSubmit: (data: SupplierForm) => void;
    isPending: boolean;
}

function SupplierFormModal({ isOpen, onClose, supplier, onSubmit, isPending }: SupplierFormModalProps) {
    const { t, te } = useT();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>({
        resolver: zodResolver(supplierSchema),
        defaultValues: supplier
            ? { name: supplier.name, email: supplier.email ?? "", phone: supplier.phone ?? "", notes: supplier.notes ?? "" }
            : {},
    });

    const handleClose = () => { reset(); onClose(); };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={supplier ? t("proveedores.editar") : t("proveedores.nuevo")}
            className="max-w-md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input
                    id="name"
                    label={`${t("comun.nombre")} *`}
                    placeholder={t("proveedores.ejemploNombre")}
                    error={te(errors.name?.message)}
                    {...register("name")}
                />
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        id="email"
                        label={t("proveedores.email")}
                        type="email"
                        placeholder={t("proveedores.ejemploEmail")}
                        error={te(errors.email?.message)}
                        {...register("email")}
                    />
                    <Input
                        id="phone"
                        label={t("proveedores.telefono")}
                        placeholder={t("proveedores.ejemploTelefono")}
                        error={te(errors.phone?.message)}
                        {...register("phone")}
                    />
                </div>
                <Input
                    id="notes"
                    label={t("proveedores.notas")}
                    placeholder={t("proveedores.ejemploNotas")}
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

// ── Página ────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
    const { t, tn } = useT();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Supplier | undefined>();

    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const { data: suppliers = [], isLoading } = useSuppliers();
    const createMutation = useCreateSupplier();
    const updateMutation = useUpdateSupplier();
    const deleteMutation = useDeleteSupplier();

    const handleOpenNew = () => { setEditing(undefined); setFormOpen(true); };
    const handleOpenEdit = (s: Supplier) => { setEditing(s); setFormOpen(true); };
    const handleClose = () => { setFormOpen(false); setEditing(undefined); };

    const handleSubmit = (data: SupplierForm) => {
        // Normalizar email vacío a undefined
        const payload = { ...data, email: data.email?.trim() || undefined };
        if (editing) {
            updateMutation.mutate({ id: editing.id, form: payload }, { onSuccess: handleClose });
        } else {
            createMutation.mutate(payload, { onSuccess: handleClose });
        }
    };

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.proveedores")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{tn("proveedores.registrados", suppliers.length)}</p>
                </div>
                {isAdmin && (
                    <Button onClick={handleOpenNew}>
                        <PlusIcon className="h-4 w-4" />
                        {t("proveedores.nuevo")}
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : suppliers.length === 0 ? (
                <div className="py-12 text-center text-sm text-foreground-muted">{t("proveedores.vacio")}</div>
            ) : (
                <div className={cn(CLASES_TABLA_DESPLAZABLE, "rounded-xl border border-border")}>
                    <table className={CLASES_TABLA}>
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-4 py-3">{t("comun.nombre")}</th>
                                <th className="px-4 py-3">{t("proveedores.email")}</th>
                                <th className="px-4 py-3">{t("proveedores.telefono")}</th>
                                <th className="px-4 py-3">{t("proveedores.notas")}</th>
                                {isAdmin && <th className="px-4 py-3 text-right">{t("comun.acciones")}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface">
                            {suppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-surface-muted transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground">{supplier.name}</td>
                                    <td className="px-4 py-3 text-foreground-muted">{supplier.email ?? "—"}</td>
                                    <td className="px-4 py-3 text-foreground-muted">{supplier.phone ?? "—"}</td>
                                    <td className="px-4 py-3 text-foreground-muted max-w-xs truncate">{supplier.notes ?? "—"}</td>
                                    {isAdmin && (
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" onClick={() => handleOpenEdit(supplier)} title={t("comun.editar")}>
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    isLoading={deleteMutation.isPending}
                                                    onClick={() => deleteMutation.mutate(supplier.id)}
                                                    title={t("comun.eliminar")}
                                                >
                                                    <TrashIcon className="h-4 w-4 text-danger" />
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <SupplierFormModal
                key={editing?.id ?? "new"}
                isOpen={formOpen}
                onClose={handleClose}
                supplier={editing}
                onSubmit={handleSubmit}
                isPending={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
}
