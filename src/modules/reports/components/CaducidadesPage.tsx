import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArchiveBoxXMarkIcon } from "@heroicons/react/24/outline";
import { VacioDeLista } from "@/shared/components/VacioDeLista";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Modal } from "@/shared/components/Modal";
import { Select } from "@/shared/components/Select";
import { EsqueletoLista } from "@/shared/components/Esqueleto";
import { useT } from "@/shared/hooks/useIdioma";
import { formatearDia } from "@/shared/lib/fechas";
import { formatearImporte } from "@/shared/lib/moneda";
import { cuandoCaduca, tonoDeCaducidad } from "@/shared/lib/lotes";
import { CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { SelectorDeAlmacen } from "@/modules/warehouses/components/SelectorDeAlmacen";
import { useAlmacenes } from "@/modules/warehouses/hooks/useWarehouses";
import { useExpiryReport, useWriteOffLot } from "@/modules/reports/hooks/useExpiryReport";
import type { ExpiryRow } from "@/modules/reports/types/reports.types";

const PAGE_SIZE = 50;

/** Los plazos que se ofrecen. El de Configuración se añade si no es uno de estos. */
const PLAZOS = [7, 15, 30, 60, 90];

/** Confirmar la baja: retira del inventario lo que queda de un lote caducado en un almacén. */
function ConfirmarBaja({ fila, onClose }: { fila: ExpiryRow; onClose: () => void }) {
    const { t } = useT();
    const baja = useWriteOffLot();
    const huecos = { lote: fila.code, producto: fila.productName, almacen: fila.warehouseName, cantidad: fila.stock };

    return (
        <Modal isOpen onClose={onClose} title={t("caducidades.confirmarTitulo")} className="max-w-md">
            <div className="flex flex-col gap-4">
                <p className="text-sm text-foreground">{t("caducidades.confirmarTexto", huecos)}</p>
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                    <Button type="button" variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button
                        type="button"
                        variant="danger"
                        isLoading={baja.isPending}
                        onClick={() => baja.mutate(fila, { onSuccess: onClose })}
                    >
                        {t("caducidades.darDeBaja")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/**
 * T5-15 — el informe de caducidades.
 *
 * Dos cosas distintas en la misma lista, y por eso el resumen las separa: **lo ya caducado**,
 * que está en la estantería sin poder venderse y hay que dar de baja, y **lo que caduca en el
 * plazo**, que todavía se puede vender si alguien se entera a tiempo. Una fila es un lote en un
 * almacén: es adonde hay que ir a buscarlo.
 *
 * Es una pantalla de almacén: filas apiladas y sin tabla, para leerla con el móvil en la mano.
 * «Dar de baja» es un ajuste a cero de ese lote en ese almacén, no una salida: tirar no es
 * vender, y no debe contar en la rotación.
 */
export default function CaducidadesPage() {
    const traductor = useT();
    const { t, tn, idioma } = traductor;
    const puede = usePuede();
    const { hayVarios } = useAlmacenes();
    const [page, setPage] = useState(1);
    // AUD-019 — los filtros viven en la URL (`?dias=`, `?almacen=`, `?caducado=1`), como los de
    // Productos: se comparten, sobreviven a ir a un lote y volver, y el panel puede enlazar con uno.
    // Con `replace`: cambiar de filtro no es una entrada del historial.
    const [params, setParams] = useSearchParams();
    const almacen = params.get("almacen") ?? "";
    // Vacío es «el plazo de Configuración»: lo decide el servidor, y la respuesta dice cuál fue.
    const plazo = /^\d+$/.test(params.get("dias") ?? "") ? params.get("dias")! : "";
    const soloCaducado = params.get("caducado") === "1";
    const filtrar = (nombre: string, valor: string) => {
        setParams(
            (actuales) => {
                const siguientes = new URLSearchParams(actuales);
                if (valor) siguientes.set(nombre, valor);
                else siguientes.delete(nombre);
                return siguientes;
            },
            { replace: true },
        );
        setPage(1);
    };
    const [aDarDeBaja, setADarDeBaja] = useState<ExpiryRow | null>(null);

    const { data, isLoading } = useExpiryReport({
        page,
        limit: PAGE_SIZE,
        warehouseId: almacen || undefined,
        days: plazo === "" ? undefined : Number(plazo),
        expired: soloCaducado || undefined,
    });
    // El plazo no cuenta como filtro que quitar: siempre hay uno, y quitarlo es volver al de Configuración.
    const hayFiltros = almacen !== "" || soloCaducado;
    const filas = data?.data ?? [];
    const totalPages = data?.meta.totalPages ?? 1;
    const dias = data?.days;

    const plazos = dias !== undefined && !PLAZOS.includes(dias) ? [...PLAZOS, dias].sort((a, b) => a - b) : PLAZOS;
    const puedeDarDeBaja = puede("POST /products/:id/movements");

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.caducidades")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("caducidades.subtitulo")}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="sm:w-56">
                    <Select
                        id="plazo"
                        label={t("caducidades.plazo")}
                        options={plazos.map((n) => ({ value: String(n), label: tn("caducidades.dias", n) }))}
                        value={plazo === "" ? String(dias ?? "") : plazo}
                        onChange={(e) => filtrar("dias", e.target.value)}
                    />
                </div>
                <div className="sm:w-64">
                    <SelectorDeAlmacen comoFiltro value={almacen} onChange={(id) => filtrar("almacen", id)} />
                </div>
                {/* AUD-019 — quien va a retirar lo vencido no necesita lo que todavía se vende. El
                    filtro es del servidor (la lista va paginada); el resumen de abajo no cambia. */}
                <label className="flex min-h-11 items-center gap-2 text-sm text-foreground md:pointer-fine:min-h-9">
                    <input
                        type="checkbox"
                        checked={soloCaducado}
                        onChange={(e) => filtrar("caducado", e.target.checked ? "1" : "")}
                        className="h-4 w-4"
                    />
                    {t("caducidades.soloCaducado")}
                </label>
            </div>

            {data && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{t("caducidades.yaCaducado")}</p>
                        <p className={data.summary.expiredUnits > 0 ? "text-sm font-semibold text-danger tabular-nums" : "text-sm text-foreground tabular-nums"}>
                            {tn("caducidades.lotesUnidadesYValor", data.summary.expiredCount, {
                                unidades: data.summary.expiredUnits,
                                valor: formatearImporte(data.summary.expiredCostValue),
                            })}
                        </p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{t("caducidades.porCaducar")}</p>
                        <p className="text-sm text-foreground tabular-nums">
                            {/* AUD-019 — del resumen y no de `meta.total − caducados`: con «solo lo
                                caducado», `meta` cuenta solo esas filas y aquí saldría 0. */}
                            {tn("caducidades.lotesUnidadesYValor", data.summary.expiringCount, {
                                unidades: data.summary.expiringUnits,
                                valor: formatearImporte(data.summary.expiringCostValue),
                            })}
                        </p>
                    </div>
                    {data.summary.unitsWithoutCost > 0 && (
                        <p className="text-xs text-warning sm:col-span-2">{tn("caducidades.sinCoste", data.summary.unitsWithoutCost)}</p>
                    )}
                </div>
            )}

            {isLoading ? (
                <EsqueletoLista />
            ) : filas.length === 0 ? (
                <VacioDeLista
                    texto={t(soloCaducado ? "caducidades.vacioCaducado" : hayFiltros ? "caducidades.vacioConFiltro" : "caducidades.vacio")}
                    onQuitarFiltros={hayFiltros ? () => { setParams((p) => { const s = new URLSearchParams(p); s.delete("almacen"); s.delete("caducado"); return s; }, { replace: true }); setPage(1); } : undefined}
                />
            ) : (
                <ul className="space-y-3">
                    {filas.map((fila) => (
                        <li
                            key={`${fila.lotId}-${fila.warehouseId}`}
                            className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                        >
                            <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-foreground">{fila.productName}</p>
                                <p className="break-words text-xs text-foreground-muted">
                                    {t("lotes.delMovimiento", { codigo: fila.code, fecha: formatearDia(idioma, fila.expiresAt) })}
                                    {/* AUD-019 — cada dato entero en su línea: el SKU se partía por el guion
                                        («ALI-» / «JAM-200») a 390 px. */}
                                    {hayVarios && <span className="whitespace-nowrap"> · {fila.warehouseName}</span>}
                                    {fila.sku && <span className="whitespace-nowrap"> · {fila.sku}</span>}
                                </p>
                                <div className="mt-1">
                                    <Badge variant={tonoDeCaducidad(fila.daysLeft)}>{cuandoCaduca(traductor, fila.daysLeft)}</Badge>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
                                <div className="text-xs text-foreground-muted tabular-nums sm:text-right">
                                    <p className="text-sm font-semibold text-foreground">{t("lotes.unidades", { cantidad: fila.stock })}</p>
                                    <p>
                                        {fila.costValue === null
                                            ? t("caducidades.sinValor")
                                            : t("caducidades.valor", { valor: formatearImporte(fila.costValue) })}
                                    </p>
                                </div>
                                {/* Solo lo caducado se da de baja desde aquí: lo que aún no ha vencido se vende. */}
                                {fila.expired && puedeDarDeBaja && (
                                    <Button
                                        variant="secondary"
                                        aria-label={t("caducidades.darDeBajaEste", { lote: fila.code, producto: fila.productName, almacen: fila.warehouseName })}
                                        onClick={() => setADarDeBaja(fila)}
                                    >
                                        <ArchiveBoxXMarkIcon className="h-4 w-4" />
                                        {t("caducidades.darDeBaja")}
                                    </Button>
                                )}
                            </div>
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

            <p className="text-xs text-foreground-muted">{t("caducidades.nota")}</p>

            {aDarDeBaja && <ConfirmarBaja fila={aDarDeBaja} onClose={() => setADarDeBaja(null)} />}
        </div>
    );
}
