import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Input } from "@/shared/components/Input";
import { Modal } from "@/shared/components/Modal";
import { Select } from "@/shared/components/Select";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import { formatearFecha } from "@/shared/lib/fechas";
import { ESTADO_CONTEO, buscarEstado } from "@/shared/lib/estados";
import { CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { useCategories } from "@/modules/catalog/hooks/useCategories";
import { useCreateInventoryCount, useInventoryCounts } from "@/modules/inventory-counts/hooks/useInventoryCounts";
import type { InventoryCountStatus } from "@/modules/inventory-counts/types/inventory-counts.types";

const PAGE_SIZE = 20;

const numeroDeConteo = (id: string) => id.slice(0, 8).toUpperCase();

/** Abrir una sesión: una categoría o el catálogo entero, y una nota para saber qué estante es. */
function NuevoConteo({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useT();
    const navigate = useNavigate();
    const { data: categorias = [] } = useCategories();
    const crear = useCreateInventoryCount();
    const [categoryId, setCategoryId] = useState("");
    const [note, setNote] = useState("");

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        crear.mutate(
            { categoryId: categoryId || null, note: note.trim() || undefined },
            { onSuccess: (conteo) => navigate(`/inventory-counts/${conteo.id}`) },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("conteos.nuevo")}>
            <form onSubmit={enviar} className="space-y-4">
                <Select
                    label={t("conteos.categoria")}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={[
                        { value: "", label: t("conteos.todoElCatalogo") },
                        ...categorias.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                />
                <Input label={t("conteos.nota")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
                <p className="text-xs text-foreground-muted">{t("conteos.alcance")}</p>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={crear.isPending}>{t("conteos.abrir")}</Button>
                </div>
            </form>
        </Modal>
    );
}

/**
 * T5-07 — las sesiones de conteo físico. Cada tarjeta lleva a su sesión, donde se cuenta,
 * se revisa y se cierra.
 */
export default function InventoryCountsPage() {
    const { t, tn, idioma } = useT();
    const puede = usePuede();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<InventoryCountStatus | "">("");
    const [nuevo, setNuevo] = useState(false);

    const { data, isLoading } = useInventoryCounts({ page, limit: PAGE_SIZE, status: status || undefined });
    const conteos = data?.data ?? [];
    const totalPages = data?.meta.totalPages ?? 1;

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.conteos")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("conteos.subtitulo")}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {puede("POST /inventory-counts") && (
                        <Button onClick={() => setNuevo(true)}>
                            <PlusIcon className="h-4 w-4" />
                            {t("conteos.nuevo")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="max-w-xs">
                <Select
                    label={t("conteos.filtroEstado")}
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as InventoryCountStatus | ""); setPage(1); }}
                    options={[
                        { value: "", label: t("comun.todos") },
                        { value: "OPEN", label: t("estado.conteo.OPEN") },
                        { value: "CLOSED", label: t("estado.conteo.CLOSED") },
                        { value: "CANCELLED", label: t("estado.conteo.CANCELLED") },
                    ]}
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : conteos.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">{t("conteos.vacio")}</div>
            ) : (
                <ul className="space-y-3">
                    {conteos.map((conteo) => (
                        <li key={conteo.id}>
                            <Link
                                to={`/inventory-counts/${conteo.id}`}
                                className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="shrink-0"><EstadoBadge estado={buscarEstado(ESTADO_CONTEO, conteo.status)} /></span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {t("conteos.numero", { numero: numeroDeConteo(conteo.id) })}
                                            {" · "}
                                            {conteo.category?.name ?? t("conteos.todoElCatalogo")}
                                        </p>
                                        <p className="text-xs text-foreground-muted truncate">
                                            {formatearFecha(idioma, conteo.createdAt)}
                                            {conteo.note ? ` · ${conteo.note}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs text-foreground-muted tabular-nums sm:text-right">
                                    <p>{t("conteos.progreso", { contados: conteo.summary.counted, total: conteo.summary.lines })}</p>
                                    <p>{tn("conteos.conDiferencia", conteo.summary.withDifference)}</p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{t("comun.paginaDeTotal", { pagina: page, total: totalPages })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("comun.anterior")}</Button>
                        <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{t("comun.siguiente")}</Button>
                    </div>
                </div>
            )}

            {nuevo && <NuevoConteo isOpen={nuevo} onClose={() => setNuevo(false)} />}
        </div>
    );
}
