import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import type { CatalogItemForm } from "@/modules/catalog/types/catalog.types";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { cn } from "@/shared/lib/cn";

// ── Validación ────────────────────────────────────────────────────────────────

// Los mensajes son claves del catálogo (T4-04); ver `auth.schema.ts`.
const catalogItemSchema = z.object({
    name: z.string().trim()
        .min(1, "validacion.nombreRequerido" satisfies Clave)
        .max(100, "validacion.maximo100" satisfies Clave),
    description: z.string().trim().max(500, "validacion.maximo500" satisfies Clave).optional(),
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
    const { t, te } = useT();
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
                    label={`${t("comun.nombre")} *`}
                    placeholder={t("comun.nombre")}
                    error={te(errors.name?.message)}
                    {...register("name")}
                />
                <Input
                    id="description"
                    label={t("comun.descripcion")}
                    placeholder={t("catalogo.descripcionOpcional")}
                    error={te(errors.description?.message)}
                    {...register("description")}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={isPending}>{t("comun.guardar")}</Button>
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

/**
 * Los textos de cada entidad, **en frases enteras** (T4-04).
 *
 * Antes se componían con el nombre del tipo: `Nueva ${entityLabel.toLowerCase()}` y
 * `No hay ${entityLabel.toLowerCase()}s registradas`. Eso ya cojeaba en español —el
 * artículo concuerda en género y el plural no siempre es «+s»—, y con un idioma más
 * no hay forma de arreglarlo: en inglés el adjetivo va delante y el plural cambia de
 * palabra. Cada pantalla trae sus claves y aquí solo se pintan.
 */
export interface TextosDeCatalogo {
    titulo: Clave;
    descripcion: Clave;
    nueva: Clave;
    editar: Clave;
    vacio: Clave;
}

interface CatalogItemSectionProps {
    textos: TextosDeCatalogo;
    items: CatalogItem[];
    isLoading: boolean;
    onCreate: (data: CatalogItemForm) => void;
    onUpdate: (id: string, data: CatalogItemForm) => void;
    onDelete: (id: string) => void;
    isSubmitting: boolean;
    isDeleting: boolean;
}

export function CatalogItemSection({
    textos,
    items,
    isLoading,
    onCreate,
    onUpdate,
    onDelete,
    isSubmitting,
    isDeleting,
}: CatalogItemSectionProps) {
    const { t } = useT();
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
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t(textos.titulo)}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t(textos.descripcion)}</p>
                </div>
                {isAdmin && (
                    <Button onClick={handleOpenNew}>
                        <PlusIcon className="h-4 w-4" />
                        {t(textos.nueva)}
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : items.length === 0 ? (
                <div className="py-12 text-center text-sm text-foreground-muted">
                    {t(textos.vacio)}
                </div>
            ) : (
                <div className={cn(CLASES_TABLA_DESPLAZABLE, "rounded-xl border border-border")}>
                    <table className={CLASES_TABLA}>
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-4 py-3">{t("comun.nombre")}</th>
                                <th className="px-4 py-3">{t("comun.descripcion")}</th>
                                {isAdmin && <th className="px-4 py-3 text-right">{t("comun.acciones")}</th>}
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
                                                <Button variant="ghost" onClick={() => handleOpenEdit(item)} title={t("comun.editar")}>
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    isLoading={isDeleting}
                                                    onClick={() => onDelete(item.id)}
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

            <CatalogFormModal
                key={editing?.id ?? `new-${textos.titulo}`}
                isOpen={formOpen}
                onClose={handleClose}
                title={t(editing ? textos.editar : textos.nueva)}
                item={editing}
                onSubmit={handleSubmit}
                isPending={isSubmitting}
            />
        </div>
    );
}
