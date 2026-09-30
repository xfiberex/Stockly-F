import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeftIcon, CheckIcon, ViewfinderCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { EscanerModal } from "@/shared/components/EscanerModal";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Modal } from "@/shared/components/Modal";
import { Spinner } from "@/shared/components/Spinner";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { cn } from "@/shared/lib/cn";
import { formatearFecha } from "@/shared/lib/fechas";
import { formatearImporte } from "@/shared/lib/moneda";
import { ESTADO_CONTEO, buscarEstado } from "@/shared/lib/estados";
import { CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { useBuscarPorCodigo } from "@/modules/products/hooks/useBuscarPorCodigo";
import {
    useCancelInventoryCount,
    useCloseInventoryCount,
    useInventoryCount,
    useInventoryCountLines,
    useRecordInventoryCountLines,
} from "@/modules/inventory-counts/hooks/useInventoryCounts";
import type { InventoryCount, InventoryCountLineFilter } from "@/modules/inventory-counts/types/inventory-counts.types";

const PAGE_SIZE = 50;

/**
 * Sin el ancho mínimo de `CLASES_TABLA` (640 px). Se cuenta con el móvil en la mano, y con ese
 * mínimo la columna del campo quedaba **fuera de la pantalla**, detrás de un desplazamiento
 * horizontal sin barra: visto en el navegador a 393 px, no en jsdom. Estas dos tablas caben a
 * ese ancho y las columnas secundarias aparecen desde `sm`.
 */
const CLASES_TABLA_DE_CONTEO = "w-full text-sm";

const numeroDeConteo = (id: string) => id.slice(0, 8).toUpperCase();

/** `+3` / `−2` / `0`, con el signo de verdad y no un guion. */
const conSigno = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

const ROTULO_DE_FILTRO: Record<InventoryCountLineFilter, Clave> = {
    difference: "conteos.filtro.difference",
    counted: "conteos.filtro.counted",
    pending: "conteos.filtro.pending",
};

function Paginacion({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
    const { t } = useT();
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-foreground-muted">
            <span>{t("comun.paginaDeTotal", { pagina: page, total: totalPages })}</span>
            <div className="flex gap-2">
                <Button variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>{t("comun.anterior")}</Button>
                <Button variant="secondary" disabled={page === totalPages} onClick={() => onPage(page + 1)}>{t("comun.siguiente")}</Button>
            </div>
        </div>
    );
}

/**
 * Anotar lo contado, **a ciegas**: no hay columna con el stock del sistema. Poner ese número
 * delante de quien cuenta hace que el conteo tienda a darle la razón aunque no la tenga. La
 * diferencia aparece en «Revisar», después.
 */
function Captura({ id }: { id: string }) {
    const { t } = useT();
    const [busqueda, setBusqueda] = useState("");
    const [soloPendientes, setSoloPendientes] = useState(true);
    const [page, setPage] = useState(1);
    const [cifras, setCifras] = useState<Record<string, string>>({});
    const search = useDebounce(busqueda.trim(), 400);
    // T5-08 — el producto del último escaneo. Mientras lo hay, la tabla enseña solo su línea,
    // esté contada o no: volver a escanear algo ya contado es recontarlo.
    const [escaneando, setEscaneando] = useState(false);
    const [escaneado, setEscaneado] = useState<{ id: string; nombre: string } | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const { buscar, buscando } = useBuscarPorCodigo();

    const { data, isLoading } = useInventoryCountLines(id, escaneado
        ? { page: 1, limit: PAGE_SIZE, productId: escaneado.id }
        : { page, limit: PAGE_SIZE, filter: soloPendientes ? "pending" : undefined, search: search || undefined });
    const anotar = useRecordInventoryCountLines(id);
    const lineas = data?.data ?? [];

    // Solo lo que se ha escrito en esta página y es un entero válido; lo demás no se envía.
    const anotadas = lineas.flatMap((l) => {
        const valor = cifras[l.productId];
        if (valor === undefined || valor.trim() === "") return [];
        const n = Number(valor);
        return Number.isInteger(n) && n >= 0 && n !== l.countedQuantity ? [{ productId: l.productId, countedQuantity: n }] : [];
    });

    const guardar = () =>
        anotar.mutate(anotadas, { onSuccess: () => setCifras({}) });

    const handleCodigo = async (codigo: string) => {
        setEscaneando(false);
        const producto = await buscar(codigo);
        if (producto === null) setAviso(t("conteos.escaneoDesconocido", { codigo }));
        else if (producto) {
            setAviso(null);
            setEscaneado({ id: producto.id, nombre: producto.name });
        }
    };

    return (
        <section className="bg-surface rounded-xl border border-border">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    {/* Con un producto escaneado la tabla enseña solo su línea: la búsqueda y el
                        filtro no se aplican, y enseñarlos —el filtro, marcado— diría lo contrario. */}
                    {!escaneado && (
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                            placeholder={t("conteos.buscar")}
                            aria-label={t("conteos.buscar")}
                            className="w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-64 md:min-h-9"
                        />
                    )}
                    <Button variant="secondary" onClick={() => setEscaneando(true)} isLoading={buscando}>
                        <ViewfinderCircleIcon className="h-4 w-4" />
                        {t("escaner.escanear")}
                    </Button>
                    {!escaneado && (
                        <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                                type="checkbox"
                                checked={soloPendientes}
                                onChange={(e) => { setSoloPendientes(e.target.checked); setPage(1); }}
                                className="h-4 w-4"
                            />
                            {t("conteos.soloPendientes")}
                        </label>
                    )}
                </div>
                <Button onClick={guardar} disabled={anotadas.length === 0} isLoading={anotar.isPending}>
                    <CheckIcon className="h-4 w-4" />
                    {t("conteos.guardar", { cantidad: anotadas.length })}
                </Button>
            </div>

            {aviso && <p role="alert" className="px-4 pb-3 text-sm text-danger">{aviso}</p>}
            {escaneado && (
                <div className="flex flex-wrap items-center gap-2 px-4 pb-3 text-sm text-foreground">
                    <span>{t("conteos.escaneado", { nombre: escaneado.nombre })}</span>
                    <Button variant="secondary" onClick={() => setEscaneado(null)}>{t("conteos.verTodos")}</Button>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : lineas.length === 0 ? (
                <p className="px-4 pb-6 text-sm text-foreground-muted">
                    {escaneado
                        ? t("conteos.escaneoFuera", { nombre: escaneado.nombre })
                        : t(soloPendientes ? "conteos.todoContado" : "conteos.sinLineas")}
                </p>
            ) : (
                <div className={CLASES_TABLA_DESPLAZABLE}>
                    <table className={CLASES_TABLA_DE_CONTEO}>
                        <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-4 py-3">{t("conteos.producto")}</th>
                                <th className="hidden px-4 py-3 sm:table-cell">{t("conteos.sku")}</th>
                                <th className="px-4 py-3 text-right">{t("conteos.contado")}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {lineas.map((l) => (
                                <tr key={l.id}>
                                    <td className="px-4 py-2 text-foreground">
                                        {l.name}
                                        <span className="block text-xs text-foreground-muted">
                                            {/* El SKU tiene su columna desde `sm`; en el móvil va aquí. */}
                                            {l.sku && <span className="sm:hidden">{l.sku} · </span>}
                                            {l.category}
                                        </span>
                                    </td>
                                    <td className="hidden px-4 py-2 text-foreground-muted whitespace-nowrap sm:table-cell">{l.sku ?? "—"}</td>
                                    <td className="px-4 py-2 text-right">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            step={1}
                                            value={cifras[l.productId] ?? (l.countedQuantity ?? "")}
                                            onChange={(e) => setCifras((c) => ({ ...c, [l.productId]: e.target.value }))}
                                            aria-label={t("conteos.contadoDe", { nombre: l.name })}
                                            // T5-08 — el escaneado recibe el cursor, con la cifra que
                                            // tuviera seleccionada: se escribe encima sin borrar.
                                            autoFocus={escaneado?.id === l.productId}
                                            onFocus={(e) => { if (escaneado?.id === l.productId) e.target.select(); }}
                                            className="w-24 min-h-11 rounded-lg border border-border bg-surface px-2 py-1 text-right text-sm tabular-nums text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 md:min-h-9"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Paginacion page={page} totalPages={data?.meta.totalPages ?? 1} onPage={setPage} />
            <EscanerModal isOpen={escaneando} onClose={() => setEscaneando(false)} onCodigo={handleCodigo} />
        </section>
    );
}

/** Lo anotado frente a lo esperado, y en una sesión cerrada lo que se aplicó y a qué coste. */
function Revision({ conteo }: { conteo: InventoryCount }) {
    const { t } = useT();
    const [filtro, setFiltro] = useState<InventoryCountLineFilter>("difference");
    const [page, setPage] = useState(1);
    const { data, isLoading } = useInventoryCountLines(conteo.id, { page, limit: PAGE_SIZE, filter: filtro });
    const lineas = data?.data ?? [];
    const cerrada = conteo.status === "CLOSED";

    return (
        <section className="bg-surface rounded-xl border border-border">
            <div role="group" aria-label={t("conteos.filtroLineas")} className="flex flex-wrap gap-2 p-4">
                {(Object.keys(ROTULO_DE_FILTRO) as InventoryCountLineFilter[]).map((f) => (
                    <Button
                        key={f}
                        variant={filtro === f ? "primary" : "secondary"}
                        aria-pressed={filtro === f}
                        onClick={() => { setFiltro(f); setPage(1); }}
                    >
                        {t(ROTULO_DE_FILTRO[f])}
                    </Button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : lineas.length === 0 ? (
                <p className="px-4 pb-6 text-sm text-foreground-muted">{t("conteos.sinLineas")}</p>
            ) : (
                <div className={CLASES_TABLA_DESPLAZABLE}>
                    <table className={CLASES_TABLA_DE_CONTEO}>
                        <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-4 py-3">{t("conteos.producto")}</th>
                                <th className="hidden px-4 py-3 text-right sm:table-cell">{t("conteos.esperado")}</th>
                                <th className="hidden px-4 py-3 text-right sm:table-cell">{t("conteos.contado")}</th>
                                <th className="px-4 py-3 text-right">{t("conteos.diferencia")}</th>
                                {cerrada && <th className="hidden px-4 py-3 text-right sm:table-cell">{t("conteos.valor")}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {lineas.map((l) => (
                                <tr key={l.id}>
                                    <td className="px-4 py-3 text-foreground">
                                        {l.name}
                                        {l.sku && <span className="block text-xs text-foreground-muted">{l.sku}</span>}
                                        <span className="block text-xs text-foreground-muted tabular-nums sm:hidden">
                                            {t("conteos.esperadoContado", { esperado: l.expectedQuantity ?? "—", contado: l.countedQuantity ?? "—" })}
                                        </span>
                                    </td>
                                    <td className="hidden px-4 py-3 text-right tabular-nums text-foreground-muted sm:table-cell">{l.expectedQuantity ?? "—"}</td>
                                    <td className="hidden px-4 py-3 text-right tabular-nums text-foreground sm:table-cell">{l.countedQuantity ?? "—"}</td>
                                    <td
                                        className={cn(
                                            "px-4 py-3 text-right tabular-nums font-medium",
                                            (l.difference ?? 0) < 0 ? "text-danger" : (l.difference ?? 0) > 0 ? "text-success" : "text-foreground-muted",
                                        )}
                                    >
                                        {l.difference === null ? "—" : conSigno(l.difference)}
                                    </td>
                                    {cerrada && (
                                        <td className="hidden px-4 py-3 text-right tabular-nums text-foreground-muted sm:table-cell">
                                            {l.adjustment !== null && l.unitCost !== null ? formatearImporte(l.adjustment * l.unitCost) : "—"}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Paginacion page={page} totalPages={data?.meta.totalPages ?? 1} onPage={setPage} />
        </section>
    );
}

/**
 * T5-07 — una sesión de conteo. Abierta: se cuenta (a ciegas), se revisa y se cierra o se
 * cancela. Cerrada o cancelada: es su informe.
 */
export default function InventoryCountPage() {
    const { id = "" } = useParams();
    const { t, tn, idioma } = useT();
    const puede = usePuede();
    const { data: conteo, isLoading } = useInventoryCount(id);
    const [vista, setVista] = useState<"contar" | "revisar">("contar");
    const [confirmar, setConfirmar] = useState<"cerrar" | "cancelar" | null>(null);
    const cerrar = useCloseInventoryCount(id);
    const cancelar = useCancelInventoryCount(id);

    if (isLoading || !conteo) {
        return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
    }

    const abierta = conteo.status === "OPEN";
    const puedeContar = abierta && puede("PATCH /inventory-counts/:id/lines");
    const { summary } = conteo;
    const vistaActual = puedeContar ? vista : "revisar";

    const tarjetas: Array<{ label: string; value: string | number; tono?: string }> = [
        { label: t("conteos.tarjeta.contados"), value: t("conteos.progreso", { contados: summary.counted, total: summary.lines }) },
        { label: t("conteos.tarjeta.conDiferencia"), value: summary.withDifference },
        { label: t("conteos.tarjeta.sobrante"), value: `+${summary.unitsOver} · ${formatearImporte(summary.valueOver)}`, tono: "text-success" },
        { label: t("conteos.tarjeta.faltante"), value: `−${summary.unitsShort} · ${formatearImporte(summary.valueShort)}`, tono: "text-danger" },
    ];

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "space-y-6")}>
            <Link to="/inventory-counts" className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
                <ArrowLeftIcon className="h-4 w-4" />
                {t("ruta.conteos")}
            </Link>

            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold text-foreground">{t("conteos.numero", { numero: numeroDeConteo(conteo.id) })}</h1>
                        <EstadoBadge estado={buscarEstado(ESTADO_CONTEO, conteo.status)} />
                    </div>
                    <p className="text-sm text-foreground-muted mt-1">
                        {t("conteos.cabecera", {
                            alcance: conteo.category?.name ?? t("conteos.todoElCatalogo"),
                            fecha: formatearFecha(idioma, conteo.createdAt),
                            quien: conteo.createdByEmail ?? "—",
                        })}
                    </p>
                    {conteo.note && <p className="text-sm text-foreground mt-1">{conteo.note}</p>}
                    {conteo.closedAt && (
                        <p className="text-xs text-foreground-muted mt-1">
                            {t(conteo.status === "CLOSED" ? "conteos.cerradoPor" : "conteos.canceladoPor", {
                                fecha: formatearFecha(idioma, conteo.closedAt),
                                quien: conteo.closedByEmail ?? "—",
                            })}
                        </p>
                    )}
                </div>
                {abierta && (
                    <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                        {puede("POST /inventory-counts/:id/cancel") && (
                            <Button variant="secondary" onClick={() => setConfirmar("cancelar")}>
                                <XMarkIcon className="h-4 w-4" />
                                {t("conteos.cancelar")}
                            </Button>
                        )}
                        {puede("POST /inventory-counts/:id/close") && (
                            <Button onClick={() => setConfirmar("cerrar")} disabled={summary.counted === 0}>
                                <CheckIcon className="h-4 w-4" />
                                {t("conteos.cerrar")}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {tarjetas.map(({ label, value, tono }) => (
                    <div key={label} className="bg-surface rounded-xl border border-border p-3 sm:p-5 min-w-0">
                        <p className={cn("text-base sm:text-xl font-bold tabular-nums text-foreground", tono)}>{value}</p>
                        <p className="text-xs text-foreground-muted leading-tight">{label}</p>
                    </div>
                ))}
            </div>
            {summary.linesWithoutCost > 0 && (
                <p className="text-xs text-foreground-muted">{tn("conteos.sinCoste", summary.linesWithoutCost)}</p>
            )}

            {puedeContar && (
                <div role="group" aria-label={t("conteos.vista")} className="flex gap-2">
                    {(["contar", "revisar"] as const).map((v) => (
                        <Button key={v} variant={vista === v ? "primary" : "secondary"} aria-pressed={vista === v} onClick={() => setVista(v)}>
                            {t(v === "contar" ? "conteos.vistaContar" : "conteos.vistaRevisar")}
                        </Button>
                    ))}
                </div>
            )}

            {vistaActual === "contar" ? <Captura id={conteo.id} /> : <Revision conteo={conteo} />}

            <Modal
                isOpen={confirmar === "cerrar"}
                onClose={() => setConfirmar(null)}
                title={t("conteos.confirmarCierreTitulo", { numero: numeroDeConteo(conteo.id) })}
            >
                <div className="space-y-3 text-sm text-foreground">
                    <p>{tn("conteos.confirmarCierreAjustes", summary.withDifference)}</p>
                    {summary.uncounted > 0 && <p className="text-foreground-muted">{tn("conteos.confirmarCierreSinContar", summary.uncounted)}</p>}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setConfirmar(null)}>{t("comun.volver")}</Button>
                        <Button isLoading={cerrar.isPending} onClick={() => cerrar.mutate(undefined, { onSuccess: () => setConfirmar(null) })}>
                            {t("conteos.cerrarYAjustar")}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={confirmar === "cancelar"}
                onClose={() => setConfirmar(null)}
                title={t("conteos.confirmarCancelTitulo", { numero: numeroDeConteo(conteo.id) })}
            >
                <div className="space-y-3 text-sm text-foreground">
                    <p>{t("conteos.confirmarCancelTexto")}</p>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setConfirmar(null)}>{t("comun.volver")}</Button>
                        <Button variant="danger" isLoading={cancelar.isPending} onClick={() => cancelar.mutate(undefined, { onSuccess: () => setConfirmar(null) })}>
                            {t("conteos.cancelar")}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
