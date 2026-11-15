import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { AvisoDeCambiosSinGuardar } from "@/shared/components/AvisoDeCambiosSinGuardar";
import { Button } from "@/shared/components/Button";
import { ConfirmarAccion } from "@/shared/components/ConfirmarAccion";
import { Input } from "@/shared/components/Input";
import { EsqueletoTabla } from "@/shared/components/Esqueleto";
import { useT } from "@/shared/hooks/useIdioma";
import type { OrigenPrecioSugerido, SugerenciaReposicion } from "@/shared/contratos";
import type { Clave } from "@/shared/i18n/traducir";
import { formatearImporte } from "@/shared/lib/moneda";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { useGenerateFromSuggestions, useReorderSuggestions } from "@/modules/purchase-orders/hooks/usePurchaseOrders";
import { SelectorDeAlmacen } from "@/modules/warehouses/components/SelectorDeAlmacen";
import { useAlmacenDeOperacion, useAlmacenes } from "@/modules/warehouses/hooks/useWarehouses";

// Más que las diez de la lista de órdenes: aquí se revisa y se marca, y partir un mismo
// proveedor entre páginas obliga a generar su pedido en dos órdenes.
const PAGE_SIZE = 50;

/**
 * De dónde sale el precio propuesto. Un mapa y no una clave compuesta con el valor: así cada
 * clave aparece escrita —el guardián del catálogo las encuentra— y un origen nuevo en el
 * contrato no compila hasta tener su rótulo.
 */
const ROTULO_DE_ORIGEN: Record<OrigenPrecioSugerido, Clave> = {
    LAST_PURCHASE: "reposicion.origen.LAST_PURCHASE",
    COST: "reposicion.origen.COST",
};

/** Lo que el usuario ha cambiado de una línea. Lo que no ha tocado sale de la sugerencia. */
interface Edicion {
    incluida?: boolean;
    cantidad?: string;
    precio?: string;
}

/**
 * Una línea sin proveedor no se puede generar (el backend la rechazaría con
 * `PRODUCT_WITHOUT_SUPPLIER`), y una sin precio conocido empieza **sin marcar**: el precio
 * no se rellena con el de venta, así que marcarla sola dejaría una línea inválida esperando.
 */
function valoresIniciales(s: SugerenciaReposicion) {
    return {
        incluida: s.supplier !== null && s.proposedUnitPrice !== null,
        cantidad: String(s.suggestedQuantity),
        precio: s.proposedUnitPrice === null ? "" : String(s.proposedUnitPrice),
    };
}

/** Las filas de la página agrupadas por proveedor, en el orden en que llegan. */
function agruparPorProveedor(filas: SugerenciaReposicion[]) {
    const grupos: Array<{ clave: string; supplier: SugerenciaReposicion["supplier"]; filas: SugerenciaReposicion[] }> = [];
    for (const fila of filas) {
        const clave = fila.supplier?.id ?? "";
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.clave === clave) ultimo.filas.push(fila);
        else grupos.push({ clave, supplier: fila.supplier, filas: [fila] });
    }
    return grupos;
}

/**
 * T5-05 — lo que conviene pedir, revisable antes de que exista ninguna orden.
 *
 * La revisión ocurre **aquí y no después** porque una orden de compra no permite editar sus
 * líneas: si «Generar» creara las órdenes con lo sugerido, la única corrección posible sería
 * cancelarlas y escribirlas a mano. Cada línea enseña los términos de la fórmula para que el
 * número se pueda discutir, no solo aceptar.
 */
export default function SugerenciasReposicionPage() {
    const { t, tn } = useT();
    const [page, setPage] = useState(1);
    const [ediciones, setEdiciones] = useState<Record<string, Edicion>>({});

    const { data, isLoading } = useReorderSuggestions({ page, limit: PAGE_SIZE });
    const generar = useGenerateFromSuggestions();
    // T5-14 — la sugerencia es del producto, no de un local; a qué almacén se pide se elige aquí.
    const almacen = useAlmacenDeOperacion();
    const { activos } = useAlmacenes();
    const [confirmando, setConfirmando] = useState(false);

    const filas = data?.data ?? [];
    const totalPages = data?.meta.totalPages ?? 1;

    const editar = (productId: string, cambio: Edicion) =>
        setEdiciones((prev) => ({ ...prev, [productId]: { ...prev[productId], ...cambio } }));

    // AUD-011 — cambiar de página ya no borra lo editado: las ediciones van por producto, así que
    // volver a una página la enseña como se dejó. «Generar» sigue siendo de la página que se ve.
    const cambiarDePagina = setPage;
    const hayEdiciones = Object.keys(ediciones).length > 0;

    const lineas = filas.map((s) => {
        const valores = { ...valoresIniciales(s), ...ediciones[s.productId] };
        const cantidad = Number(valores.cantidad);
        const precio = Number(valores.precio);
        const generable = s.supplier !== null;
        const errorCantidad = !Number.isInteger(cantidad) || cantidad <= 0 ? t("reposicion.cantidadInvalida") : undefined;
        const errorPrecio = valores.precio.trim() === "" || !(precio > 0) ? t("reposicion.precioInvalido") : undefined;
        const incluida = generable && valores.incluida;
        // AUD-019 — lo que costará la línea. Solo si las dos cifras valen: con una a medio
        // escribir, un subtotal sería un número que nadie ha pedido.
        const subtotal = errorCantidad || errorPrecio ? null : cantidad * precio;
        return { s, valores, cantidad, precio, generable, incluida, errorCantidad, errorPrecio, subtotal };
    });

    const incluidas = lineas.filter((l) => l.incluida);
    const hayErrores = incluidas.some((l) => l.errorCantidad || l.errorPrecio);
    const porId = new Map(lineas.map((l) => [l.s.productId, l]));

    // AUD-019 — lo marcado, por proveedor y con su importe: lo dicen la cabecera de cada grupo, la
    // línea de resumen y la confirmación. Antes se generaban órdenes sin ver ningún importe. Por
    // nombre de proveedor, que es el orden en que las crea el servidor.
    const porProveedor = new Map<string, { nombre: string; lineas: number; importe: number }>();
    for (const l of incluidas) {
        const proveedor = l.s.supplier!;
        const grupo = porProveedor.get(proveedor.id) ?? { nombre: proveedor.name, lineas: 0, importe: 0 };
        grupo.lineas += 1;
        grupo.importe += l.subtotal ?? 0;
        porProveedor.set(proveedor.id, grupo);
    }
    const ordenesAGenerar = [...porProveedor.entries()].sort(([, a], [, b]) => a.nombre.localeCompare(b.nombre));
    const proveedores = ordenesAGenerar.length;
    const total = ordenesAGenerar.reduce((suma, [, orden]) => suma + orden.importe, 0);
    // Solo con varios almacenes tiene sentido decir a cuál: con uno, es el de siempre.
    const nombreDelAlmacen = almacen.hayVarios ? activos.find((a) => a.id === almacen.warehouseId)?.name : undefined;

    const confirmar = () => {
        if (incluidas.length === 0 || hayErrores) return;
        generar.mutate(
            { warehouseId: almacen.paraEnviar, items: incluidas.map((l) => ({ productId: l.s.productId, quantity: l.cantidad, unitPrice: l.precio })) },
            // Lo generado deja de sugerirse (ya es «pendiente de recibir») y sus ediciones sobran;
            // las de otras páginas siguen siendo de alguien y se quedan. El diálogo se cierra aquí
            // y no al pulsar: si el servidor rechaza, queda abierto con su aviso delante.
            {
                onSuccess: () => {
                    setConfirmando(false);
                    setEdiciones((prev) => {
                        const quedan = { ...prev };
                        for (const l of incluidas) delete quedan[l.s.productId];
                        return quedan;
                    });
                },
            },
        );
    };

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <Link to="/purchase-orders" className="inline-flex items-center gap-1 text-sm text-info hover:underline">
                <ArrowLeftIcon className="h-4 w-4" />
                {t("reposicion.volver")}
            </Link>

            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.sugerenciasReposicion")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("reposicion.subtitulo", { dias: data?.days ?? 30 })}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    <Button onClick={() => setConfirmando(true)} disabled={incluidas.length === 0 || hayErrores}>
                        <SparklesIcon className="h-4 w-4" />
                        {t("reposicion.generar")}
                    </Button>
                </div>
            </div>

            <div className="max-w-xs">
                <SelectorDeAlmacen label={t("compras.form.almacen")} value={almacen.warehouseId} onChange={almacen.setWarehouseId} />
            </div>

            <div className="rounded-lg border border-border bg-surface-muted p-3 text-xs text-foreground-muted space-y-1">
                <p>{t("reposicion.formula")}</p>
                <p>{t("reposicion.alcance")}</p>
            </div>

            {isLoading ? (
                <EsqueletoTabla columnas={6} />
            ) : filas.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">{t("reposicion.vacio")}</div>
            ) : (
                <>
                    <p className="text-sm text-foreground-muted" aria-live="polite">
                        {tn("reposicion.marcadas", incluidas.length)}
                        {incluidas.length > 0 && <> · {tn("reposicion.seCrearan", proveedores)}</>}
                        {incluidas.length > 0 && !hayErrores && <> {t("reposicion.totalMarcado", { importe: formatearImporte(total) })}</>}
                    </p>

                    <div className="bg-surface rounded-xl border border-border">
                        <div className={CLASES_TABLA_DESPLAZABLE}>
                            <table className={CLASES_TABLA}>
                                <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                    <tr>
                                        <th className="px-2 py-3 w-8"><span className="sr-only">{t("reposicion.generar")}</span></th>
                                        <th className="px-2 py-3">{t("ordenes.producto")}</th>
                                        <th className="px-2 py-3 text-right">{t("reposicion.disponible")}</th>
                                        <th className="px-2 py-3 text-right">{t("reposicion.minimo")}</th>
                                        <th className="px-2 py-3 text-right">{t("reposicion.pendiente")}</th>
                                        <th className="px-2 py-3 text-right">{t("reposicion.salidasDia")}</th>
                                        <th className="px-2 py-3 text-right">{t("reposicion.sugerido")}</th>
                                        <th className="px-2 py-3 text-right">{t("reposicion.aPedir")}</th>
                                        <th className="px-2 py-3 text-right">{t("ordenes.precioUnitario")}</th>
                                        <th className="px-2 py-3 text-right">{t("ordenes.subtotal")}</th>
                                    </tr>
                                </thead>
                                {agruparPorProveedor(filas).map((grupo) => {
                                    const primera = grupo.filas[0]!;
                                    const marcado = grupo.supplier ? porProveedor.get(grupo.supplier.id) : undefined;
                                    // Con una línea marcada a medio escribir, el total del grupo no
                                    // se enseña: sumaría solo las demás.
                                    const grupoConErrores = grupo.filas.some((f) => {
                                        const l = porId.get(f.productId)!;
                                        return l.incluida && l.subtotal === null;
                                    });
                                    return (
                                        <tbody key={grupo.clave} className="divide-y divide-border border-t border-border">
                                            <tr className="bg-surface-muted/60">
                                                <th colSpan={10} scope="colgroup" className="px-2 py-2 text-left text-sm font-semibold text-foreground">
                                                    {grupo.supplier ? (
                                                        <>
                                                            {grupo.supplier.name}
                                                            <span className="ml-2 text-xs font-normal text-foreground-muted">
                                                                {t("proveedores.plazoCorto")}: {tn("proveedores.plazoDias", primera.leadTimeDays)}
                                                                {primera.leadTimeIsDefault && (
                                                                    <span title={t("reposicion.plazoPorDefectoAyuda")}> ({t("reposicion.plazoPorDefecto")})</span>
                                                                )}
                                                            </span>
                                                            {/* Junto al nombre y no a la derecha: la tabla se desplaza a lo
                                                                ancho, y al otro extremo de la fila quedaba fuera de la vista. */}
                                                            {marcado && !grupoConErrores && (
                                                                <span className="ml-3 tabular-nums">
                                                                    {t("reposicion.totalProveedor", { importe: formatearImporte(marcado.importe) })}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {t("reposicion.sinProveedor")}
                                                            <span className="ml-2 text-xs font-normal text-foreground-muted">{t("reposicion.sinProveedorAyuda")}</span>
                                                        </>
                                                    )}
                                                </th>
                                            </tr>
                                            {grupo.filas.map((s) => {
                                                const l = porId.get(s.productId)!;
                                                return (
                                                    <tr key={s.productId} className={l.generable ? undefined : "text-foreground-muted"}>
                                                        <td className="px-2 py-2">
                                                            {l.generable && (
                                                                <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center md:min-h-0 md:min-w-0">
                                                                    <input
                                                                        type="checkbox"
                                                                        aria-label={t("reposicion.incluir", { producto: s.productName })}
                                                                        checked={l.incluida}
                                                                        onChange={(e) => editar(s.productId, { incluida: e.target.checked })}
                                                                        className="h-4 w-4 rounded border-border text-info focus:ring-accent"
                                                                    />
                                                                </label>
                                                            )}
                                                        </td>
                                                        {/* Ancho mínimo: con nueve columnas, en móvil el nombre se quedaba en
                                                            cuatro líneas y el SKU partido por sus guiones (visto a 412 px). */}
                                                        <td className="px-2 py-2 min-w-48">
                                                            <span className="font-medium text-foreground">{s.productName}</span>
                                                            {s.sku && <span className="block whitespace-nowrap text-xs text-foreground-muted">{s.sku}</span>}
                                                        </td>
                                                        <td className="px-2 py-2 text-right tabular-nums">{s.availableStock}</td>
                                                        <td className="px-2 py-2 text-right tabular-nums">{s.minStock}</td>
                                                        <td className="px-2 py-2 text-right tabular-nums">{s.pendingReceipt}</td>
                                                        <td className="px-2 py-2 text-right tabular-nums">{s.dailyVelocity}</td>
                                                        <td className="px-2 py-2 text-right tabular-nums font-semibold text-foreground">{s.suggestedQuantity}</td>
                                                        <td className="px-2 py-2 text-right">
                                                            {l.generable && (
                                                                <div className="ml-auto w-20">
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        min={1}
                                                                        step={1}
                                                                        className="w-full text-right tabular-nums"
                                                                        aria-label={t("reposicion.cantidadDe", { producto: s.productName })}
                                                                        value={l.valores.cantidad}
                                                                        error={l.incluida ? l.errorCantidad : undefined}
                                                                        onChange={(e) => editar(s.productId, { cantidad: e.target.value })}
                                                                    />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2 text-right">
                                                            {l.generable && (
                                                                <div className="ml-auto w-24">
                                                                    <Input
                                                                        type="number"
                                                                        inputMode="decimal"
                                                                        min={0}
                                                                        step="0.01"
                                                                        className="w-full text-right tabular-nums"
                                                                        aria-label={t("reposicion.precioDe", { producto: s.productName })}
                                                                        value={l.valores.precio}
                                                                        error={l.incluida ? l.errorPrecio : undefined}
                                                                        onChange={(e) => editar(s.productId, { precio: e.target.value })}
                                                                    />
                                                                    <span className="mt-0.5 block text-xs text-foreground-muted">
                                                                        {s.priceSource ? t(ROTULO_DE_ORIGEN[s.priceSource]) : t("reposicion.origen.ninguno")}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {!l.generable && s.proposedUnitPrice !== null && (
                                                                <span className="tabular-nums">{formatearImporte(s.proposedUnitPrice)}</span>
                                                            )}
                                                        </td>
                                                        {/* AUD-019 — atenuado si no está marcada: se ve lo que costaría,
                                                            pero no entra en el total. */}
                                                        <td className={l.incluida ? "px-2 py-2 text-right tabular-nums font-medium text-foreground" : "px-2 py-2 text-right tabular-nums text-foreground-muted"}>
                                                            {l.generable && l.subtotal !== null && formatearImporte(l.subtotal)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    );
                                })}
                            </table>
                        </div>
                    </div>
                </>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{t("comun.paginaDeTotal", { pagina: page, total: totalPages })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => cambiarDePagina(page - 1)}>
                            {t("comun.anterior")}
                        </Button>
                        <Button variant="secondary" disabled={page === totalPages} onClick={() => cambiarDePagina(page + 1)}>
                            {t("comun.siguiente")}
                        </Button>
                    </div>
                </div>
            )}

            <AvisoDeCambiosSinGuardar activo={hayEdiciones} mensaje={t("reposicion.sinGuardar.aviso")} />

            {/* AUD-019 — una orden de compra no se edita después de crearla: antes de que existan,
                se dice cuántas, a quién y por cuánto. */}
            <ConfirmarAccion
                abierto={confirmando}
                titulo={tn("reposicion.confirmar.titulo", proveedores)}
                confirmar={t("reposicion.generar")}
                peligro={false}
                pendiente={generar.isPending}
                onConfirmar={confirmar}
                onCerrar={() => setConfirmando(false)}
            >
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {ordenesAGenerar.map(([clave, orden]) => (
                        <li key={clave} className="flex items-baseline justify-between gap-4 px-3 py-2">
                            <span className="min-w-0">
                                <span className="font-medium">{orden.nombre}</span>
                                <span className="block text-xs text-foreground-muted">{tn("reposicion.confirmar.lineas", orden.lineas)}</span>
                            </span>
                            <span className="shrink-0 tabular-nums">{formatearImporte(orden.importe)}</span>
                        </li>
                    ))}
                    <li className="flex items-baseline justify-between gap-4 bg-surface-muted px-3 py-2 font-semibold">
                        <span>{t("reposicion.confirmar.total")}</span>
                        <span className="tabular-nums">{formatearImporte(total)}</span>
                    </li>
                </ul>
                <p className="text-foreground-muted">
                    {nombreDelAlmacen
                        ? t("reposicion.confirmar.consecuenciaEn", { almacen: nombreDelAlmacen })
                        : t("reposicion.confirmar.consecuencia")}
                </p>
            </ConfirmarAccion>
        </div>
    );
}
