import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Input } from "@/shared/components/Input";
import { Modal } from "@/shared/components/Modal";
import { Select } from "@/shared/components/Select";
import { EsqueletoLista } from "@/shared/components/Esqueleto";
import { VacioDeLista } from "@/shared/components/VacioDeLista";
import { useT } from "@/shared/hooks/useIdioma";
import { formatearFecha } from "@/shared/lib/fechas";
import { ESTADO_CONTEO, buscarEstado } from "@/shared/lib/estados";
import { CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { useCategories } from "@/modules/catalog/hooks/useCategories";
import { useCreateInventoryCount, useInventoryCounts } from "@/modules/inventory-counts/hooks/useInventoryCounts";
import type { InventoryCountStatus } from "@/modules/inventory-counts/types/inventory-counts.types";
import { SelectorDeAlmacen } from "@/modules/warehouses/components/SelectorDeAlmacen";
import { useAlmacenDeOperacion, useAlmacenes } from "@/modules/warehouses/hooks/useWarehouses";

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
    // T5-14 — se cuenta un almacén: lo esperado de cada línea es lo que hay en él.
    const almacen = useAlmacenDeOperacion();

    // AUD-019 — lo que ya se está contando en ese almacén. Un producto no puede estar en dos conteos
    // abiertos del mismo almacén, y antes eso solo se sabía al enviar (409). Se marca y no se ofrece:
    // una categoría con conteo abierto, y el catálogo entero si hay cualquiera abierto. El servidor
    // sigue siendo quien decide —mira producto por producto—; esto evita el viaje casi siempre.
    const { data: abiertos } = useInventoryCounts(
        { page: 1, limit: 100, status: "OPEN", warehouseId: almacen.warehouseId || undefined },
        { enabled: almacen.warehouseId !== "" },
    );
    const enEsteAlmacen = (abiertos?.data ?? []).filter((c) => c.warehouse.id === almacen.warehouseId);
    const delCatalogoEntero = enEsteAlmacen.find((c) => c.category === null);
    const categoriasOcupadas = new Set(enEsteAlmacen.flatMap((c) => (c.category ? [c.category.id] : [])));
    const ocupada = (id: string) => (id === "" ? enEsteAlmacen.length > 0 : delCatalogoEntero !== undefined || categoriasOcupadas.has(id));

    const opciones: Array<{ value: string; label: string; disabled?: boolean }> = [
        { value: "", label: t("conteos.todoElCatalogo") },
        ...categorias.map((c) => ({ value: c.id, label: c.name })),
    ].map((o) => (ocupada(o.value) ? { ...o, label: t("conteos.yaEnConteo", { nombre: o.label }), disabled: true } : o));
    // Si lo elegido está ocupado —al principio, «todo el catálogo» con otro conteo abierto—, la
    // primera libre. Sin ninguna libre no hay qué abrir.
    const elegida = opciones.find((o) => o.value === categoryId && !o.disabled)?.value ?? opciones.find((o) => !o.disabled)?.value ?? null;

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        if (elegida === null) return;
        crear.mutate(
            { warehouseId: almacen.paraEnviar, categoryId: elegida || null, note: note.trim() || undefined },
            { onSuccess: (conteo) => navigate(`/inventory-counts/${conteo.id}`) },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("conteos.nuevo")}>
            <form onSubmit={enviar} className="space-y-4">
                <SelectorDeAlmacen label={t("conteos.almacen")} value={almacen.warehouseId} onChange={almacen.setWarehouseId} />
                <Select
                    label={t("conteos.categoria")}
                    value={elegida ?? ""}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={opciones}
                    disabled={elegida === null}
                    aria-describedby={enEsteAlmacen.length > 0 ? "conteos-ocupados" : undefined}
                />
                {delCatalogoEntero ? (
                    <p id="conteos-ocupados" className="text-sm text-warning">
                        {t("conteos.catalogoEnteroAbierto")}{" "}
                        <Link to={`/inventory-counts/${delCatalogoEntero.id}`} className="font-medium underline underline-offset-2">
                            {t("conteos.verElConteo", { numero: numeroDeConteo(delCatalogoEntero.id) })}
                        </Link>
                    </p>
                ) : (
                    enEsteAlmacen.length > 0 && <p id="conteos-ocupados" className="text-xs text-foreground-muted">{t("conteos.ocupadasAyuda")}</p>
                )}
                <Input label={t("conteos.nota")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
                <p className="text-xs text-foreground-muted">{t("conteos.alcance")}</p>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={crear.isPending} disabled={elegida === null}>{t("conteos.abrir")}</Button>
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
    // AUD-008, paso 9 — «Conteos abiertos» del panel llega con `?estado=OPEN`.
    const [params] = useSearchParams();
    const [status, setStatus] = useState<InventoryCountStatus | "">(() => {
        const deLaUrl = params.get("estado");
        return deLaUrl === "OPEN" || deLaUrl === "CLOSED" || deLaUrl === "CANCELLED" ? deLaUrl : "";
    });
    const [nuevo, setNuevo] = useState(false);
    const [almacenFiltrado, setAlmacenFiltrado] = useState("");
    const { hayVarios } = useAlmacenes();

    const { data, isLoading } = useInventoryCounts({ page, limit: PAGE_SIZE, status: status || undefined, warehouseId: almacenFiltrado || undefined });
    const hayFiltros = status !== "" || almacenFiltrado !== "";
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

            <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
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
                <SelectorDeAlmacen comoFiltro value={almacenFiltrado} onChange={(id) => { setAlmacenFiltrado(id); setPage(1); }} />
            </div>

            {isLoading ? (
                <EsqueletoLista />
            ) : conteos.length === 0 ? (
                <VacioDeLista
                    texto={t(hayFiltros ? "conteos.sinResultados" : "conteos.vacio")}
                    onQuitarFiltros={hayFiltros ? () => { setStatus(""); setAlmacenFiltrado(""); setPage(1); } : undefined}
                />
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
                                            {hayVarios && <> · {conteo.warehouse.name}</>}
                                        </p>
                                        <p className="text-xs text-foreground-muted truncate">
                                            {formatearFecha(idioma, conteo.createdAt)}
                                            {conteo.note ? ` · ${conteo.note}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-xs text-foreground-muted tabular-nums sm:text-right">
                                    <p>{t("conteos.progreso", { contados: conteo.summary.counted, total: conteo.summary.lines })}</p>
                                    {/* AUD-019 — a ciegas también aquí: mientras el conteo está abierto, saber
                                        cuántas líneas no cuadran sesga a quien sigue contando. */}
                                    {conteo.status !== "OPEN" && <p>{tn("conteos.conDiferencia", conteo.summary.withDifference)}</p>}
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
