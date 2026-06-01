import { useState } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/modules/tags/hooks/useTags";
import type { Tag } from "@/modules/tags/types/tags.types";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

const PRESET_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

interface TagFormData {
    name: string;
    color: string;
}

interface TagFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    tag?: Tag;
}

function TagFormModal({ isOpen, onClose, tag }: TagFormModalProps) {
    const isEditing = !!tag;
    const createMutation = useCreateTag();
    const updateMutation = useUpdateTag();
    const isPending = createMutation.isPending || updateMutation.isPending;

    const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TagFormData>({
        defaultValues: { name: tag?.name ?? "", color: tag?.color ?? PRESET_COLORS[0] },
    });

    const selectedColor = watch("color");

    const onSubmit = (form: TagFormData) => {
        const dto = { name: form.name, color: form.color || undefined };
        if (isEditing) {
            updateMutation.mutate({ id: tag.id, dto }, { onSuccess: () => { onClose(); reset(); } });
        } else {
            createMutation.mutate(dto, { onSuccess: () => { onClose(); reset(); } });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar etiqueta" : "Nueva etiqueta"} className="max-w-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input
                    id="name"
                    label="Nombre *"
                    placeholder="Ej: Electrónica"
                    error={errors.name?.message}
                    {...register("name", { required: "El nombre es obligatorio" })}
                />

                <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Color</p>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setValue("color", c)}
                                className="h-7 w-7 rounded-full transition-transform hover:scale-110 ring-offset-2"
                                style={{
                                    backgroundColor: c,
                                    outline: selectedColor === c ? `2px solid ${c}` : "none",
                                    outlineOffset: "2px",
                                }}
                            />
                        ))}
                    </div>
                    <input type="hidden" {...register("color")} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" isLoading={isPending}>
                        {isEditing ? "Guardar cambios" : "Crear etiqueta"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export default function TagsPage() {
    const [formOpen, setFormOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | undefined>();
    const { data: tags = [], isLoading } = useTags();
    const deleteMutation = useDeleteTag();

    const handleEdit = (tag: Tag) => {
        setEditingTag(tag);
        setFormOpen(true);
    };

    const handleClose = () => {
        setFormOpen(false);
        setEditingTag(undefined);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Etiquetas</h1>
                    <p className="text-sm text-gray-500 mt-1">{tags.length} etiqueta{tags.length !== 1 ? "s" : ""}</p>
                </div>
                <Button onClick={() => setFormOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    Nueva etiqueta
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : tags.length === 0 ? (
                <div className="py-16 text-center text-sm text-gray-400">
                    No hay etiquetas. Crea la primera para organizar tus productos.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tags.map((tag) => (
                        <div key={tag.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                            <div
                                className="h-4 w-4 rounded-full shrink-0"
                                style={{ backgroundColor: tag.color ?? "#94a3b8" }}
                            />
                            <span className="text-sm font-medium text-gray-900 flex-1 truncate">{tag.name}</span>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" onClick={() => handleEdit(tag)}>
                                    <PencilIcon className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    isLoading={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate(tag.id)}
                                >
                                    <TrashIcon className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <TagFormModal isOpen={formOpen} onClose={handleClose} tag={editingTag} />
        </div>
    );
}
