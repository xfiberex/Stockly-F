import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { CatalogItemForm } from "@/modules/catalog/types/catalog.types";

// ── Validación ────────────────────────────────────────────────────────────────

const catalogItemSchema = z.object({
    name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "Máximo 100 caracteres"),
    description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

// ── Form modal ────────────────────────────────────────────────────────────────

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    item?: { id: string; name: string; description: string | null };
    onSubmit: (data: CatalogItemForm) => void;
    isPending: boolean;
}

export function CatalogFormModal({ isOpen, onClose, title, item, onSubmit, isPending }: FormModalProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<CatalogItemForm>({
        resolver: zodResolver(catalogItemSchema),
        defaultValues: item ? { name: item.name, description: item.description ?? "" } : {},
    });

    const handleClose = () => { reset(); onClose(); };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} className="max-w-md">
            <form onSubmit={handleSubmit((data) => onSubmit(data))} className="flex flex-col gap-4">
                <Input
                    id="name"
                    label="Nombre *"
                    placeholder="Nombre"
                    error={errors.name?.message}
                    {...register("name")}
                />
                <Input
                    id="description"
                    label="Descripción"
                    placeholder="Descripción opcional"
                    error={errors.description?.message}
                    {...register("description")}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isPending}>Guardar</Button>
                </div>
            </form>
        </Modal>
    );
}

// ── Sección con tabla + CRUD ──────────────────────────────────────────────────

export interface CatalogItem {
    id: string;
    name: string;
    description: string | null;
}

interface CatalogItemSectionProps {
    title: string;
    description: string;
    entityLabel: string;
    items: CatalogItem[];
    isLoading: boolean;
    onCreate: (data: CatalogItemForm) => void;
    onUpdate: (id: string, data: CatalogItemForm) => void;
    onDelete: (id: string) => void;
    isSubmitting: boolean;
    isDeleting: boolean;
}

export function CatalogItemSection({
    title,
    description,
    entityLabel,
    items,
    isLoading,
    onCreate,
    onUpdate,
    onDelete,
    isSubmitting,
    isDeleting,
}: CatalogItemSectionProps) {
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CatalogItem | undefined>();

    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    const handleOpenNew = () => { setEditing(undefined); setFormOpen(true); };
    const handleOpenEdit = (item: CatalogItem) => { setEditing(item); setFormOpen(true); };
    const handleClose = () => { setFormOpen(false); setEditing(undefined); };

    const handleSubmit = (data: CatalogItemForm) => {
        if (editing) {
            onUpdate(editing.id, data);
        } else {
            onCreate(data);
        }
        handleClose();
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{description}</p>
                </div>
                {isAdmin && (
                    <Button onClick={handleOpenNew}>
                        <PlusIcon className="h-4 w-4" />
                        {`Nueva ${entityLabel.toLowerCase()}`}
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : items.length === 0 ? (
                <div className="py-12 text-center text-sm text-foreground-muted">
                    No hay {entityLabel.toLowerCase()}s registradas. Crea la primera.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Descripción</th>
                                {isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-muted transition-colors">
                                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                                    <td className="px-4 py-3 text-foreground-muted max-w-xs truncate">
                                        {item.description ?? "—"}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" onClick={() => handleOpenEdit(item)} title="Editar">
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    isLoading={isDeleting}
                                                    onClick={() => onDelete(item.id)}
                                                    title="Eliminar"
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

            <CatalogFormModal
                key={editing?.id ?? `new-${title}`}
                isOpen={formOpen}
                onClose={handleClose}
                title={editing ? `Editar ${entityLabel.toLowerCase()}` : `Nueva ${entityLabel.toLowerCase()}`}
                item={editing}
                onSubmit={handleSubmit}
                isPending={isSubmitting}
            />
        </div>
    );
}
