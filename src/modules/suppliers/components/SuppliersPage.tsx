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

// ── Validación ────────────────────────────────────────────────────────────────

const supplierSchema = z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(200, "Máximo 200 caracteres"),
    email: z.union([z.string().trim().email("Email no válido"), z.literal("")]).optional(),
    phone: z.string().trim().max(30, "Máximo 30 caracteres").optional(),
    notes: z.string().trim().max(1000, "Máximo 1000 caracteres").optional(),
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
            title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
            className="max-w-md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input
                    id="name"
                    label="Nombre *"
                    placeholder="Nombre del proveedor"
                    error={errors.name?.message}
                    {...register("name")}
                />
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        id="email"
                        label="Email"
                        type="email"
                        placeholder="contacto@proveedor.com"
                        error={errors.email?.message}
                        {...register("email")}
                    />
                    <Input
                        id="phone"
                        label="Teléfono"
                        placeholder="+1-555-0100"
                        error={errors.phone?.message}
                        {...register("phone")}
                    />
                </div>
                <Input
                    id="notes"
                    label="Notas"
                    placeholder="Notas o comentarios adicionales"
                    error={errors.notes?.message}
                    {...register("notes")}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isPending}>Guardar</Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
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
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
                    <p className="text-sm text-gray-500 mt-1">{suppliers.length} proveedor{suppliers.length !== 1 ? "es" : ""} registrado{suppliers.length !== 1 ? "s" : ""}</p>
                </div>
                {isAdmin && (
                    <Button onClick={handleOpenNew}>
                        <PlusIcon className="h-4 w-4" />
                        Nuevo proveedor
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : suppliers.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No hay proveedores. Crea el primero.</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Teléfono</th>
                                <th className="px-4 py-3">Notas</th>
                                {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {suppliers.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{supplier.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{supplier.email ?? "—"}</td>
                                    <td className="px-4 py-3 text-gray-600">{supplier.phone ?? "—"}</td>
                                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{supplier.notes ?? "—"}</td>
                                    {isAdmin && (
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" onClick={() => handleOpenEdit(supplier)} title="Editar">
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    isLoading={deleteMutation.isPending}
                                                    onClick={() => deleteMutation.mutate(supplier.id)}
                                                    title="Eliminar"
                                                >
                                                    <TrashIcon className="h-4 w-4 text-red-500" />
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
