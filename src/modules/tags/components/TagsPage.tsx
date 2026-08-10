import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/modules/tags/hooks/useTags";
import type { Tag } from "@/modules/tags/types/tags.types";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

// T2-13: el color no puede ser lo único que identifique a cada opción. Un botón sin
// texto se anuncia como «botón» a secas, y quien no distingue los tonos —o no ve la
// pantalla— no tiene forma de saber cuál está eligiendo ni cuál está elegido.
const PRESET_COLORS: ReadonlyArray<{ valor: string; nombre: string }> = [
    { valor: "#3b82f6", nombre: "Azul" },
    { valor: "#10b981", nombre: "Verde" },
    { valor: "#f59e0b", nombre: "Ámbar" },
    { valor: "#ef4444", nombre: "Rojo" },
    { valor: "#8b5cf6", nombre: "Violeta" },
    { valor: "#ec4899", nombre: "Rosa" },
    { valor: "#06b6d4", nombre: "Cian" },
    { valor: "#84cc16", nombre: "Lima" },
    { valor: "#f97316", nombre: "Naranja" },
    { valor: "#6366f1", nombre: "Índigo" },
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

    const { register, handleSubmit, setValue, control, reset, formState: { errors } } = useForm<TagFormData>({
        defaultValues: { name: tag?.name ?? "", color: tag?.color ?? PRESET_COLORS[0].valor },
    });

    // `useWatch` en lugar de `watch()`: este último devuelve una función que el
    // React Compiler no puede memoizar, y por eso descartaba el componente entero.
    // Es el mismo patrón que ya usa `ProductForm`.
    const selectedColor = useWatch({ control, name: "color" });

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
                    <p id="color-etiqueta" className="text-sm font-medium text-foreground mb-2">Color</p>
                    {/* Conmutadores, como los de etiqueta de T2-17: `aria-pressed` es lo
                        que comunica cuál está elegido a quien no ve el contorno. */}
                    <div role="group" aria-labelledby="color-etiqueta" className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(({ valor, nombre }) => (
                            <button
                                key={valor}
                                type="button"
                                aria-label={nombre}
                                aria-pressed={selectedColor === valor}
                                onClick={() => setValue("color", valor)}
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg md:min-h-0 md:min-w-0"
                            >
                                <span
                                    aria-hidden="true"
                                    className="block h-7 w-7 rounded-full transition-transform hover:scale-110"
                                    style={{
                                        backgroundColor: valor,
                                        outline: selectedColor === valor ? `2px solid ${valor}` : "none",
                                        outlineOffset: "2px",
                                    }}
                                />
                            </button>
                        ))}
                    </div>
                    <input type="hidden" {...register("color")} />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
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
                    <h1 className="text-2xl font-bold text-foreground">Etiquetas</h1>
                    <p className="text-sm text-foreground-muted mt-1">{tags.length} etiqueta{tags.length !== 1 ? "s" : ""}</p>
                </div>
                <Button onClick={() => setFormOpen(true)}>
                    <PlusIcon className="h-4 w-4" />
                    Nueva etiqueta
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : tags.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">
                    No hay etiquetas. Crea la primera para organizar tus productos.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tags.map((tag) => (
                        <div key={tag.id} className="bg-surface rounded-xl border border-border px-4 py-3 flex items-center gap-3">
                            <div
                                className="h-4 w-4 rounded-full shrink-0"
                                style={{ backgroundColor: tag.color ?? "var(--color-foreground-muted)" }}
                            />
                            <span className="text-sm font-medium text-foreground flex-1 truncate">{tag.name}</span>
                            <div className="flex gap-1 shrink-0">
                                {/* Botones solo de icono: sin `aria-label` un lector de
                                    pantalla los anuncia como «botón», sin decir sobre
                                    qué etiqueta actúan. */}
                                <Button variant="ghost" aria-label={`Editar ${tag.name}`} onClick={() => handleEdit(tag)}>
                                    <PencilIcon className="h-3.5 w-3.5 text-foreground-muted hover:text-info" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    aria-label={`Eliminar ${tag.name}`}
                                    isLoading={deleteMutation.isPending}
                                    onClick={() => deleteMutation.mutate(tag.id)}
                                >
                                    <TrashIcon className="h-3.5 w-3.5 text-foreground-muted hover:text-danger" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* La `key` remonta el modal al cambiar de etiqueta: `useForm` solo aplica
                `defaultValues` en el primer montaje, así que sin ella editar abría el
                formulario vacío. Mismo patrón que `ProductsPage:255`. */}
            <TagFormModal key={editingTag?.id ?? "new"} isOpen={formOpen} onClose={handleClose} tag={editingTag} />
        </div>
    );
}
