import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLongRightIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Modal } from "@/shared/components/Modal";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import { disponibleEn } from "@/shared/lib/almacenes";
import { CLASES_BOTON_ICONO } from "@/shared/lib/clasesDeBoton";
import { CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { cn } from "@/shared/lib/cn";
import { formatearFechaHora } from "@/shared/lib/fechas";
import { MAXIMO_DE_LINEAS_DE_TRANSFERENCIA } from "@/shared/contratos";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { BuscadorDeProducto } from "@/modules/products/components/BuscadorDeProducto";
import type { ProductWithAvailability } from "@/modules/products/types/product.types";
import { SelectorDeAlmacen } from "@/modules/warehouses/components/SelectorDeAlmacen";
import { useAlmacenes } from "@/modules/warehouses/hooks/useWarehouses";
import { useCreateStockTransfer, useStockTransfer, useStockTransfers } from "@/modules/stock-transfers/hooks/useStockTransfers";
import type { StockTransfer } from "@/modules/stock-transfers/types/stock-transfers.types";

const PAGE_SIZE = 20;

const numeroDeTransferencia = (id: string) => id.slice(0, 8).toUpperCase();

interface Linea {
    producto: ProductWithAvailability;
    cantidad: number;
}

/**
 * Registrar una transferencia: de dónde, adónde y qué. Un producto, una línea, como en el
 * mostrador; y el disponible que acompaña a cada una es el **del origen**, que es de donde
 * sale. Cambiar el origen no borra las líneas: cada producto trae su desglose por almacén, y
 * lo que se recalcula es si siguen cabiendo.
 */
function NuevaTransferencia({ onClose }: { onClose: () => void }) {
    const { t } = useT();
    const { activos, predeterminado } = useAlmacenes();
    const crear = useCreateStockTransfer();

    const [origen, setOrigen] = useState(predeterminado?.id ?? activos[0]?.id ?? "");
    const [destino, setDestino] = useState(activos.find((a) => a.id !== (predeterminado?.id ?? activos[0]?.id))?.id ?? "");
    const [note, setNote] = useState("");
    const [lineas, setLineas] = useState<Linea[]>([]);

    // Elegir como origen el que era destino los intercambia: nunca son el mismo.
    const elegirOrigen = (id: string) => { if (id === destino) setDestino(origen); setOrigen(id); };

    const anadir = (producto: ProductWithAvailability | null) => {
        if (!producto) return;
        setLineas((actuales) => {
            if (actuales.some((l) => l.producto.id === producto.id)) {
                return actuales.map((l) => (l.producto.id === producto.id ? { producto, cantidad: l.cantidad + 1 } : l));
            }
            if (actuales.length >= MAXIMO_DE_LINEAS_DE_TRANSFERENCIA) return actuales;
            return [...actuales, { producto, cantidad: 1 }];
        });
    };
    const fijarCantidad = (id: string, cantidad: number) =>
        setLineas((actuales) => actuales.map((l) => (l.producto.id === id ? { ...l, cantidad } : l)));
    const quitar = (id: string) => setLineas((actuales) => actuales.filter((l) => l.producto.id !== id));

    const cantidadValida = (l: Linea) => Number.isInteger(l.cantidad) && l.cantidad >= 1;
    const seExcede = (l: Linea) => l.cantidad > disponibleEn(l.producto, origen);
    const sePuede = origen !== "" && destino !== "" && origen !== destino && lineas.length > 0 && lineas.every((l) => cantidadValida(l) && !seExcede(l));

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        if (!sePuede) return;
        crear.mutate(
            {
                fromWarehouseId: origen,
                toWarehouseId: destino,
                note: note.trim() || undefined,
                items: lineas.map((l) => ({ productId: l.producto.id, quantity: l.cantidad })),
            },
            { onSuccess: onClose },
        );
    };

    return (
        <Modal isOpen onClose={onClose} title={t("transferencias.nueva")} className="max-w-2xl">
            <form onSubmit={enviar} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectorDeAlmacen label={t("transferencias.origen")} value={origen} onChange={elegirOrigen} />
                    <SelectorDeAlmacen label={t("transferencias.destino")} value={destino} onChange={setDestino} excluir={origen} />
                </div>
                <Input label={t("transferencias.nota")} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />

                <BuscadorDeProducto seleccionado={null} onSeleccionar={anadir} warehouseId={origen} />

                {lineas.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-foreground-muted">
                        {t("transferencias.sinLineas")}
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {lineas.map((linea) => {
                            const { producto, cantidad } = linea;
                            const excede = seExcede(linea);
                            const invalida = excede || !cantidadValida(linea);
                            const idAyuda = `transferible-${producto.id}`;
                            return (
                                <li key={producto.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted p-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="break-words text-sm font-medium text-foreground">{producto.name}</p>
                                        <p id={idAyuda} className={cn("text-xs tabular-nums", excede ? "text-danger" : "text-foreground-muted")}>
                                            {t(excede ? "transferencias.superaDisponible" : "transferencias.disponibleEnOrigen", {
                                                cantidad: disponibleEn(producto, origen),
                                            })}
                                        </p>
                                    </div>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        step={1}
                                        aria-label={t("transferencias.cantidadDe", { nombre: producto.name })}
                                        aria-describedby={idAyuda}
                                        aria-invalid={invalida}
                                        className={cn(
                                            "min-h-11 w-20 shrink-0 rounded-lg border bg-surface px-2 text-center text-sm tabular-nums text-foreground outline-none transition md:min-h-9",
                                            "focus:border-accent focus:ring-2 focus:ring-accent/20",
                                            invalida ? "border-danger" : "border-border",
                                        )}
                                        value={Number.isNaN(cantidad) ? "" : cantidad}
                                        onChange={(e) => fijarCantidad(producto.id, e.target.value === "" ? NaN : Number(e.target.value))}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={cn(CLASES_BOTON_ICONO, "shrink-0")}
                                        aria-label={t("transferencias.quitar", { nombre: producto.name })}
                                        onClick={() => quitar(producto.id)}
                                    >
                                        <TrashIcon className="h-4 w-4 text-danger" />
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                <p className="text-xs text-foreground-muted">{t("transferencias.ayuda")}</p>
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" disabled={!sePuede} isLoading={crear.isPending}>{t("transferencias.transferir")}</Button>
                </div>
            </form>
        </Modal>
    );
}

/** Las líneas de una transferencia, que se piden al desplegarla. */
function LineasDeTransferencia({ transferencia }: { transferencia: StockTransfer }) {
    const { t } = useT();
    const { data, isLoading } = useStockTransfer(transferencia.id);

    if (isLoading || !data) return <div className="flex justify-center py-4"><Spinner /></div>;

    return (
        <ul className="divide-y divide-border border-t border-border px-4 sm:px-5">
            {data.items.map((item) => (
                <li key={item.productId} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                        <p className="break-words font-medium text-foreground">{item.name}</p>
                        {item.sku && <p className="text-xs text-foreground-muted">{item.sku}</p>}
                    </div>
                    <div className="text-xs text-foreground-muted tabular-nums sm:text-right">
                        <p className="text-sm font-semibold text-foreground">{t("transferencias.unidades", { cantidad: item.quantity })}</p>
                        <p>
                            {t("transferencias.quedan", {
                                origen: transferencia.fromWarehouse.name,
                                enOrigen: item.fromStockAfter,
                                destino: transferencia.toWarehouse.name,
                                enDestino: item.toStockAfter,
                            })}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

/**
 * T5-14 — las transferencias entre almacenes.
 *
 * Una transferencia no tiene estado: lo que sale de un almacén está en el otro en el mismo
 * instante. Por eso la lista no lleva insignias ni acciones por fila —no hay nada que enviar,
 * recibir ni cancelar—, solo qué se movió, de dónde, adónde y quién lo hizo. Deshacer una es
 * registrar la contraria.
 *
 * Es una pantalla de almacén: filas apiladas y sin tabla, para leerla con el móvil en la mano.
 */
export default function TransfersPage() {
    const { t, tn, idioma } = useT();
    const puede = usePuede();
    const { hayVarios } = useAlmacenes();
    const [page, setPage] = useState(1);
    const [almacen, setAlmacen] = useState("");
    const [nueva, setNueva] = useState(false);
    const [desplegada, setDesplegada] = useState<string | null>(null);

    const { data, isLoading } = useStockTransfers({ page, limit: PAGE_SIZE, warehouseId: almacen || undefined });
    const transferencias = data?.data ?? [];
    const totalPages = data?.meta.totalPages ?? 1;

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.transferencias")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("transferencias.subtitulo")}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {/* Con un solo almacén no hay adónde transferir: el botón no se ofrece. */}
                    {puede("POST /stock-transfers") && hayVarios && (
                        <Button onClick={() => setNueva(true)}>
                            <PlusIcon className="h-4 w-4" />
                            {t("transferencias.nueva")}
                        </Button>
                    )}
                </div>
            </div>

            {!hayVarios && (
                <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground-muted">
                    {t("transferencias.unSoloAlmacen")}{" "}
                    <Link to="/warehouses" className="text-accent underline underline-offset-2">{t("ruta.almacenes")}</Link>
                </p>
            )}

            <div className="max-w-xs">
                <SelectorDeAlmacen comoFiltro value={almacen} onChange={(id) => { setAlmacen(id); setPage(1); }} />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : transferencias.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">{t("transferencias.vacio")}</div>
            ) : (
                <ul className="space-y-3">
                    {transferencias.map((transferencia) => {
                        const abierta = desplegada === transferencia.id;
                        const numero = numeroDeTransferencia(transferencia.id);
                        return (
                            <li key={transferencia.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                                <button
                                    type="button"
                                    aria-expanded={abierta}
                                    aria-label={t("transferencias.verLineasDe", { numero })}
                                    className="flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between sm:px-5"
                                    onClick={() => setDesplegada(abierta ? null : transferencia.id)}
                                >
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-foreground">
                                            <span>{transferencia.fromWarehouse.name}</span>
                                            <ArrowLongRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-foreground-muted" />
                                            <span className="sr-only">{t("transferencias.hacia")}</span>
                                            <span>{transferencia.toWarehouse.name}</span>
                                        </p>
                                        <p className="text-xs text-foreground-muted break-words">
                                            {t("transferencias.numero", { numero })}
                                            {" · "}
                                            {formatearFechaHora(idioma, transferencia.createdAt)}
                                            {transferencia.createdByEmail ? ` · ${transferencia.createdByEmail}` : ""}
                                            {transferencia.note ? ` · ${transferencia.note}` : ""}
                                        </p>
                                    </div>
                                    <div className="text-xs text-foreground-muted tabular-nums sm:shrink-0 sm:text-right">
                                        <p className="text-sm font-semibold text-foreground">{t("transferencias.unidades", { cantidad: transferencia.units })}</p>
                                        <p>{tn("transferencias.productos", transferencia.lines)}</p>
                                    </div>
                                </button>
                                {abierta && <LineasDeTransferencia transferencia={transferencia} />}
                            </li>
                        );
                    })}
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

            {/* Se monta al abrir: cada transferencia empieza con el formulario limpio. */}
            {nueva && <NuevaTransferencia onClose={() => setNueva(false)} />}
        </div>
    );
}
