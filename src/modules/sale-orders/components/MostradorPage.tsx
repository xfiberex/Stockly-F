import { useState } from "react";
import { CheckCircleIcon, MinusIcon, PlusIcon, TrashIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { EscanerModal } from "@/shared/components/EscanerModal";
import { useT } from "@/shared/hooks/useIdioma";
import { CLASES_BOTON_ICONO } from "@/shared/lib/clasesDeBoton";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { cn } from "@/shared/lib/cn";
import { formatearImporte } from "@/shared/lib/moneda";
import { MAXIMO_DE_LINEAS_DE_MOSTRADOR, aNumero, escribirNumeroDeVenta, totalesPrevistos } from "@/shared/contratos";
import { BuscadorDeCliente } from "@/modules/customers/components/BuscadorDeCliente";
import type { CustomerListItem } from "@/modules/customers/types/customer.types";
import { BuscadorDeProducto } from "@/modules/products/components/BuscadorDeProducto";
import { useBuscarPorCodigo } from "@/modules/products/hooks/useBuscarPorCodigo";
import type { ProductWithAvailability } from "@/modules/products/types/product.types";
import { BotonDeComprobante } from "@/modules/sale-orders/components/BotonDeComprobante";
import { useVentaDeMostrador } from "@/modules/sale-orders/hooks/useSaleOrders";
import type { SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";
import { useNegocio } from "@/modules/settings/hooks/useNegocio";

/** Una línea de la venta que se está armando: un producto del catálogo y cuántos. */
interface Linea {
    producto: ProductWithAvailability;
    cantidad: number;
}

/**
 * T6-08 — el mostrador: vender en un paso.
 *
 * Se busca o se escanea cada producto, se dice cuántos, y «Registrar venta» la deja hecha:
 * cobrada, con el stock descontado y con su comprobante. Es `POST /sale-orders/counter`, que
 * manda **un producto y una cantidad por línea**: el precio que se ve aquí es el del catálogo, y
 * es el que pone el servidor, no esta pantalla.
 *
 * - **Un producto, una línea.** Elegirlo o escanearlo otra vez suma una unidad.
 * - **El total de antes de vender es una previsión** (`totalesPrevistos`, del contrato, la misma
 *   regla que el servidor); el de después es el que devuelve la venta.
 * - **Es una pantalla para usar de pie y con el móvil:** una columna, sin tabla, y con todo lo
 *   que se pulsa a 44 px.
 */
export default function MostradorPage() {
    const { t } = useT();
    const { data: negocio } = useNegocio();
    const vender = useVentaDeMostrador();

    const [lineas, setLineas] = useState<Linea[]>([]);
    const [cliente, setCliente] = useState<CustomerListItem | null>(null);
    const [hecha, setHecha] = useState<SaleOrder | null>(null);

    const [escaneando, setEscaneando] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null);
    const { buscar, buscando } = useBuscarPorCodigo();

    const anadir = (producto: ProductWithAvailability | null) => {
        if (!producto) return;
        setAviso(null);
        setLineas((actuales) => {
            const yaEsta = actuales.some((l) => l.producto.id === producto.id);
            // El producto recién traído sustituye al que había: su disponible es más reciente.
            if (yaEsta) return actuales.map((l) => (l.producto.id === producto.id ? { producto, cantidad: l.cantidad + 1 } : l));
            if (actuales.length >= MAXIMO_DE_LINEAS_DE_MOSTRADOR) return actuales;
            return [...actuales, { producto, cantidad: 1 }];
        });
    };

    // `GET /products/lookup` devuelve también los inactivos, y aquí no se venden.
    const alEscanear = async (codigo: string) => {
        setEscaneando(false);
        const producto = await buscar(codigo);
        if (producto === undefined) return;
        if (producto === null) return setAviso(t("escaner.desconocido", { codigo }));
        if (!producto.isActive) return setAviso(t("ordenes.escaneoInactivo", { nombre: producto.name }));
        anadir(producto);
    };

    const fijarCantidad = (id: string, cantidad: number) =>
        setLineas((actuales) => actuales.map((l) => (l.producto.id === id ? { ...l, cantidad } : l)));
    const quitar = (id: string) => setLineas((actuales) => actuales.filter((l) => l.producto.id !== id));

    const seExcede = (linea: Linea) => linea.cantidad > linea.producto.availableStock;
    const cantidadValida = (linea: Linea) => Number.isInteger(linea.cantidad) && linea.cantidad >= 1;
    const sePuedeVender = lineas.length > 0 && lineas.every((l) => cantidadValida(l) && !seExcede(l));

    const tasa = negocio?.taxRate ?? 0;
    const prevision = totalesPrevistos(
        lineas.filter(cantidadValida).map((l) => ({ quantity: l.cantidad, unitPrice: l.producto.price })),
        tasa,
    );
    const nombreDelImpuesto = negocio?.taxName || t("ventas.impuesto");

    const registrar = () => {
        if (!sePuedeVender) return;
        vender.mutate(
            { customerId: cliente?.id, items: lineas.map((l) => ({ productId: l.producto.id, quantity: l.cantidad })) },
            {
                onSuccess: (orden) => {
                    setHecha(orden);
                    setLineas([]);
                    setCliente(null);
                    setAviso(null);
                },
            },
        );
    };

    // ── Hecha: el número, lo cobrado y el comprobante ────────────────────────────────────
    if (hecha) {
        return (
            <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "mx-auto max-w-2xl space-y-6")}>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.mostrador")}</h1>
                <div role="status" className="space-y-4 rounded-xl border border-success/30 bg-success-surface p-5 text-center">
                    <CheckCircleIcon aria-hidden="true" className="mx-auto h-10 w-10 text-success" />
                    <p className="text-xl font-semibold text-foreground">
                        {t("mostrador.hecha", { numero: escribirNumeroDeVenta(hecha.number) })}
                    </p>
                    {/* El importe de la venta, no la previsión: es el que ha calculado el servidor. */}
                    <p className="text-2xl font-bold tabular-nums text-foreground">{formatearImporte(hecha.total)}</p>
                    {aNumero(hecha.tax) > 0 && (
                        <p className="text-sm text-foreground-muted">
                            {t("mostrador.desglose", {
                                subtotal: formatearImporte(hecha.subtotal),
                                impuesto: formatearImporte(hecha.tax),
                                nombre: nombreDelImpuesto,
                            })}
                        </p>
                    )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <BotonDeComprobante orden={hecha} />
                    <Button type="button" onClick={() => setHecha(null)}>
                        <PlusIcon className="h-4 w-4" />
                        {t("mostrador.nuevaVenta")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(CLASES_CONTENEDOR_DE_PAGINA, "mx-auto max-w-2xl space-y-5")}>
            <div>
                <h1 className="text-2xl font-bold text-foreground">{t("ruta.mostrador")}</h1>
                <p className="mt-1 text-sm text-foreground-muted">{t("mostrador.ayuda")}</p>
            </div>

            {/* Buscar o escanear. El buscador nunca tiene un producto «elegido»: cada elección
                pasa a la lista de abajo y el campo queda libre para el siguiente. */}
            <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                    <BuscadorDeProducto seleccionado={null} onSeleccionar={anadir} />
                </div>
                <Button type="button" variant="secondary" onClick={() => setEscaneando(true)} isLoading={buscando}>
                    <ViewfinderCircleIcon className="h-4 w-4" />
                    {t("escaner.escanear")}
                </Button>
            </div>
            {aviso && <p role="alert" className="text-sm text-danger">{aviso}</p>}

            <section aria-labelledby="mostrador-lineas" className="space-y-3">
                <h2 id="mostrador-lineas" className="text-base font-semibold text-foreground">{t("mostrador.lineas")}</h2>
                {lineas.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-foreground-muted">
                        {t("mostrador.vacio")}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {lineas.map((linea) => {
                            const { producto, cantidad } = linea;
                            const excede = seExcede(linea);
                            const idAyuda = `disponible-${producto.id}`;
                            return (
                                <li key={producto.id} className="rounded-xl border border-border bg-surface p-3 sm:p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-medium text-foreground">{producto.name}</p>
                                            <p className="text-xs text-foreground-muted tabular-nums">
                                                {t("mostrador.precioUnitario", { precio: formatearImporte(producto.price) })}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className={CLASES_BOTON_ICONO}
                                            aria-label={t("mostrador.quitar", { nombre: producto.name })}
                                            onClick={() => quitar(producto.id)}
                                        >
                                            <TrashIcon className="h-4 w-4 text-danger" />
                                        </Button>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                className={CLASES_BOTON_ICONO}
                                                aria-label={t("mostrador.unaMenos", { nombre: producto.name })}
                                                disabled={cantidad <= 1}
                                                onClick={() => fijarCantidad(producto.id, cantidad - 1)}
                                            >
                                                <MinusIcon className="h-4 w-4" />
                                            </Button>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                min={1}
                                                step={1}
                                                aria-label={t("mostrador.cantidadDe", { nombre: producto.name })}
                                                aria-describedby={idAyuda}
                                                aria-invalid={excede || !cantidadValida(linea)}
                                                className={cn(
                                                    "min-h-11 w-20 rounded-lg border px-2 text-center text-sm tabular-nums text-foreground outline-none transition md:min-h-9",
                                                    "focus:border-accent focus:ring-2 focus:ring-accent/20",
                                                    excede || !cantidadValida(linea) ? "border-danger" : "border-border",
                                                )}
                                                value={Number.isNaN(cantidad) ? "" : cantidad}
                                                onChange={(e) => fijarCantidad(producto.id, e.target.value === "" ? NaN : Number(e.target.value))}
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                className={CLASES_BOTON_ICONO}
                                                aria-label={t("mostrador.unaMas", { nombre: producto.name })}
                                                onClick={() => fijarCantidad(producto.id, (Number.isNaN(cantidad) ? 0 : cantidad) + 1)}
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-sm font-semibold tabular-nums text-foreground">
                                            {cantidadValida(linea) ? formatearImporte(totalesPrevistos([{ quantity: cantidad, unitPrice: producto.price }], 0).subtotal) : "—"}
                                        </p>
                                    </div>
                                    <p id={idAyuda} className={cn("mt-1 text-xs", excede ? "text-danger" : "text-foreground-muted")}>
                                        {excede
                                            ? t("mostrador.superaDisponible", { cantidad: producto.availableStock })
                                            : t("ventas.form.disponible", { cantidad: producto.availableStock })}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <BuscadorDeCliente seleccionado={cliente} onSeleccionar={setCliente} ayuda={t("mostrador.clienteAyuda")} />

            {/* Lo que se va a cobrar. `aria-live`: cambia con cada cantidad, y quien no lo ve
                tiene que enterarse igual. */}
            <dl aria-live="polite" className="space-y-1 rounded-xl border border-border bg-surface p-4 text-sm">
                {aNumero(prevision.tax) > 0 && (
                    <>
                        <div className="flex justify-between gap-4 text-foreground-muted">
                            <dt>{t("ordenes.subtotal")}</dt>
                            <dd className="tabular-nums">{formatearImporte(prevision.subtotal)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 text-foreground-muted">
                            <dt>{t("ventas.impuestoConTasa", { nombre: nombreDelImpuesto, tasa })}</dt>
                            <dd className="tabular-nums">{formatearImporte(prevision.tax)}</dd>
                        </div>
                    </>
                )}
                <div className="flex items-baseline justify-between gap-4 text-foreground">
                    <dt className="text-base font-semibold">{t("comun.total")}</dt>
                    <dd className="text-2xl font-bold tabular-nums">{formatearImporte(prevision.total)}</dd>
                </div>
            </dl>

            <Button type="button" className="w-full" disabled={!sePuedeVender} isLoading={vender.isPending} onClick={registrar}>
                {t("mostrador.registrar")}
            </Button>

            <EscanerModal isOpen={escaneando} onClose={() => setEscaneando(false)} onCodigo={alEscanear} />
        </div>
    );
}
