import { formatearImporte } from "@/shared/lib/moneda";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { ESTADO_ORDEN_VENTA, buscarEstado } from "@/shared/lib/estados";
import { Spinner } from "@/shared/components/Spinner";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";
import { Paginacion } from "@/shared/components/Paginacion";
import { EscanerModal } from "@/shared/components/EscanerModal";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { BuscadorDeProducto } from "@/modules/products/components/BuscadorDeProducto";
import { useBuscarPorCodigo } from "@/modules/products/hooks/useBuscarPorCodigo";
import type { ProductWithAvailability } from "@/modules/products/types/product.types";
import {
    useSaleOrders,
    useCreateSaleOrder,
    useUpdateSaleOrder,
    useShipSaleOrder,
    useDeleteSaleOrder,
} from "@/modules/sale-orders/hooks/useSaleOrders";
import { exportSaleOrdersCsv } from "@/modules/sale-orders/api/sale-orders.api";
import { BuscadorDeCliente } from "@/modules/customers/components/BuscadorDeCliente";
import type { CustomerListItem } from "@/modules/customers/types/customer.types";
import type { SaleOrder, SaleOrderStatus, CreateSaleOrderDto } from "@/modules/sale-orders/types/sale-orders.types";
import { PlusIcon, TrashIcon, TruckIcon, XMarkIcon, ArrowDownTrayIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { formatearFecha } from "@/shared/lib/fechas";
import { CLASES_BOTON_ICONO } from "@/shared/lib/clasesDeBoton";
import { CLASES_ENCABEZADO_DE_PAGINA, CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { cn } from "@/shared/lib/cn";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { aNumero, escribirNumeroDeVenta } from "@/shared/contratos";
import { useNegocio } from "@/modules/settings/hooks/useNegocio";

// Mismo criterio que en las órdenes de compra: el descriptor de `shared/lib/estados`
// lleva etiqueta, color e icono juntos (T2-38).

/** T6-04 — el correlativo de la venta, con sus ceros: el mismo que escribe el servidor. */
function numeroDeOrden(order: SaleOrder): string {
    return escribirNumeroDeVenta(order.number);
}

/** Lo que admite el filtro por número: hasta nueve cifras, que nunca pasan del mayor entero que guarda la base. */
const SOLO_CIFRAS = /^\d{0,9}$/;

/**
 * Los ítems que devuelven stock al cancelar. Solo cuentan los que están ligados a un
 * producto del catálogo: el backend repone con `where: { productId: { not: null } }`
 * (`sale-orders.service.ts`), así que un ítem escrito a mano no mueve inventario y
 * prometerlo en el diálogo sería mentir.
 */
function itemsQueReponen(order: SaleOrder) {
    return order.items.filter((item) => item.productId !== null);
}

// ── Confirmación de cancelación de una orden enviada ──────────────────────────

interface CancelarEnvioModalProps {
    orden: SaleOrder | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * T2-42: cancelar una orden **ya enviada** devuelve unidades al inventario (T0-03), a
 * diferencia de cancelar una pendiente, que no toca nada. Por eso esta acción pide
 * confirmación y las otras de la fila no: lo que se confirma no es el cambio de estado,
 * es el movimiento de stock, y el diálogo dice exactamente cuánto se va a reponer.
 */
function CancelarEnvioModal({ orden, isPending, onConfirm, onClose }: CancelarEnvioModalProps) {
    const { t, tn } = useT();
    const items = orden ? itemsQueReponen(orden) : [];
    const unidades = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Modal isOpen={orden !== null} onClose={onClose} title={t("ventas.cancelar.titulo")}>
            {orden && (
                <div className="flex flex-col gap-4">
                    {/* La frase entera va en el catálogo con el número de orden interpolado:
                        partirla para poder poner el `<span>` en negrita la volvería
                        intraducible, y resaltar la orden no vale ese precio. */}
                    <p className="text-sm text-foreground">
                        {t("ventas.cancelar.explicacion", {
                            orden: t("ventas.numero", { numero: numeroDeOrden(orden) }),
                        })}
                    </p>

                    {unidades > 0 ? (
                        <div className="rounded-lg border border-border bg-surface-muted p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                {tn("ventas.cancelar.repondran", unidades)}
                            </p>
                            <ul className="mt-2 space-y-1">
                                {items.map((item) => (
                                    <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
                                        <span className="text-foreground">{item.productName}</span>
                                        <span className="tabular-nums text-foreground-muted">+{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-sm text-foreground-muted">
                            {t("ventas.cancelar.sinInventario")}
                        </p>
                    )}

                    <p className="text-xs text-foreground-muted">
                        {t("ventas.cancelar.irreversible")}
                    </p>

                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                        <Button type="button" variant="secondary" onClick={onClose}>{t("comun.volver")}</Button>
                        <Button type="button" variant="danger" isLoading={isPending} onClick={onConfirm}>
                            {t("ventas.cancelar.confirmar")}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Pie de importes de una orden ──────────────────────────────────────────────

/**
 * T6-05 — el pie de la tabla de líneas. **Aquí no se suma nada**: `subtotal`, `tax` y `total`
 * los calcula el servidor y esto los pinta.
 *
 * Sin impuesto —la tasa a 0, o una orden anterior a que existiera— sale solo el total, como
 * siempre. Con él, las tres filas. El nombre es el de Configuración («ITBIS», «IVA») y, si
 * está vacío, el genérico del catálogo; la tasa se dice cuando todas las líneas con impuesto
 * llevan la misma, que hoy es siempre.
 */
function PieDeImportes({ order }: { order: SaleOrder }) {
    const { t } = useT();
    const { data: negocio } = useNegocio();
    const conImpuesto = aNumero(order.tax) > 0;

    const nombre = negocio?.taxName || t("ventas.impuesto");
    const tasas = new Set(order.items.flatMap((item) => (item.taxRate ? [item.taxRate] : [])));
    const [tasa] = tasas;
    const rotulo = tasas.size === 1 && tasa !== undefined ? t("ventas.impuestoConTasa", { nombre, tasa }) : nombre;

    const fila = (texto: string, importe: SaleOrder["total"], destacada = false) => (
        <tr>
            <td colSpan={3} className={cn("pt-2 text-right text-sm", destacada ? "font-semibold text-foreground" : "text-foreground-muted")}>{texto}</td>
            <td className={cn("pt-2 text-right tabular-nums", destacada ? "font-bold text-foreground" : "text-foreground-muted")}>
                {formatearImporte(importe)}
            </td>
        </tr>
    );

    return (
        <tfoot className="border-t border-border">
            {conImpuesto && fila(t("ordenes.subtotal"), order.subtotal)}
            {conImpuesto && fila(rotulo, order.tax)}
            {fila(t("comun.total"), order.total, true)}
        </tfoot>
    );
}

// ── Formulario nueva orden ────────────────────────────────────────────────────

interface OrderFormModalProps { isOpen: boolean; onClose: () => void; }

function OrderFormModal({ isOpen, onClose }: OrderFormModalProps) {
    const { t, te } = useT();
    const createMutation = useCreateSaleOrder();

    const { register, handleSubmit, control, reset, setValue, getValues, trigger, formState: { errors } } = useForm<CreateSaleOrderDto>({
        defaultValues: { items: [{ productName: "", quantity: 1, unitPrice: 0 }] },
    });

    // T5-06 — el cliente elegido rellena los tres campos, que **siguen siendo editables**: son
    // la instantánea de a quién se vende esta vez, y un teléfono distinto para una entrega no
    // tiene por qué cambiar la ficha del cliente. Sin elegir ninguno, la venta se vincula sola
    // por el correo que se escriba.
    const [cliente, setCliente] = useState<CustomerListItem | null>(null);
    const elegirCliente = (elegido: CustomerListItem | null) => {
        setCliente(elegido);
        if (!elegido) return;
        setValue("customerName", elegido.name);
        setValue("customerEmail", elegido.email ?? "");
        setValue("customerPhone", elegido.phone ?? "");
    };
    const cerrar = () => { setCliente(null); setAvisoDeEscaneo(null); onClose(); };

    const { fields, append, remove } = useFieldArray({ control, name: "items" });

    // T5-03 — cuánto se pide de cada producto **sumando todas las líneas**, y cuánto hay
    // disponible. El backend rechaza la venta con 409 si una suma supera lo disponible; aquí
    // se dice mientras se escribe y no se deja enviar, para que el 409 quede como red para
    // cuando el disponible cambió entre abrir el formulario y guardar.
    const lineas = useWatch({ control, name: "items" }) ?? [];
    // T6-02 — ya no hay una lista del catálogo cargada de antemano: el disponible de cada
    // producto es el que traía cuando se eligió en el buscador o se escaneó.
    const [elegidos, setElegidos] = useState<Map<string, ProductWithAvailability>>(() => new Map());
    const disponiblePorProducto = new Map([...elegidos.values()].map((p) => [p.id, p.availableStock]));
    const pedidoPorProducto = new Map<string, number>();
    for (const linea of lineas) {
        if (linea?.productId) pedidoPorProducto.set(linea.productId, (pedidoPorProducto.get(linea.productId) ?? 0) + (Number(linea.quantity) || 0));
    }
    const superaDisponible = (productId?: string) =>
        !!productId && disponiblePorProducto.has(productId) && (pedidoPorProducto.get(productId) ?? 0) > disponiblePorProducto.get(productId)!;

    // Quitar el producto deja la línea como un ítem escrito a mano, con su nombre y su precio:
    // lo que se suelta es el vínculo con el catálogo, y con él el movimiento de stock.
    const elegirProducto = (idx: number, product: ProductWithAvailability | null) => {
        if (product) {
            setElegidos((prev) => new Map(prev).set(product.id, product));
            setValue(`items.${idx}.productId`, product.id);
            setValue(`items.${idx}.productName`, product.name);
            setValue(`items.${idx}.unitPrice`, Number(product.price));
        } else {
            setValue(`items.${idx}.productId`, undefined);
        }
        // Cambiar de producto puede hacer que esta línea, u otra del mismo, pase a caber o deje de hacerlo.
        if (errors.items) void trigger("items");
    };

    const [escaneando, setEscaneando] = useState(false);
    const [avisoDeEscaneo, setAvisoDeEscaneo] = useState<string | null>(null);
    const { buscar, buscando } = useBuscarPorCodigo();

    // `GET /products/lookup` devuelve también los inactivos —la ficha del catálogo los enseña
    // como tales—, y aquí no se venden: se dice y no se añade.
    const handleCodigo = async (codigo: string) => {
        setEscaneando(false);
        const product = await buscar(codigo);
        if (product === undefined) return;
        if (product === null) return setAvisoDeEscaneo(t("escaner.desconocido", { codigo }));
        if (!product.isActive) return setAvisoDeEscaneo(t("ordenes.escaneoInactivo", { nombre: product.name }));
        setAvisoDeEscaneo(null);

        // Escanear dos veces lo mismo son dos unidades, no dos líneas; y la fila vacía con la
        // que abre el formulario se aprovecha antes de añadir otra.
        const actuales = getValues("items");
        const repetida = actuales.findIndex((l) => l.productId === product.id);
        if (repetida !== -1) {
            setElegidos((prev) => new Map(prev).set(product.id, product));
            setValue(`items.${repetida}.quantity`, (Number(actuales[repetida]!.quantity) || 0) + 1);
            return;
        }
        const libre = actuales.findIndex((l) => !l.productId && !l.productName.trim());
        if (libre !== -1) return elegirProducto(libre, product);
        setElegidos((prev) => new Map(prev).set(product.id, product));
        append({ productId: product.id, productName: product.name, quantity: 1, unitPrice: Number(product.price) });
    };

    const onSubmit = (formData: CreateSaleOrderDto) => {
        const payload: CreateSaleOrderDto = {
            customerId: cliente?.id,
            customerName: formData.customerName || undefined,
            customerEmail: formData.customerEmail || undefined,
            customerPhone: formData.customerPhone || undefined,
            notes: formData.notes || undefined,
            items: formData.items.map((item) => ({
                productId: item.productId || undefined,
                productName: item.productName,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
        };
        createMutation.mutate(payload, {
            onSuccess: () => { reset(); cerrar(); },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={cerrar} title={t("ventas.nuevaOrden")} className="max-w-2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <BuscadorDeCliente seleccionado={cliente} onSeleccionar={elegirCliente} />
                <div className="grid grid-cols-2 gap-3">
                    <Input id="customerName" label={t("ventas.cliente")} placeholder={t("ventas.ejemploCliente")} {...register("customerName")} />
                    <Input id="customerEmail" label={t("ventas.correo")} type="email" placeholder={t("ventas.ejemploCorreo")} {...register("customerEmail")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Input id="customerPhone" label={t("ventas.telefono")} placeholder={t("ventas.ejemploTelefono")} {...register("customerPhone")} />
                    <Input id="notes" label={t("ordenes.notas")} placeholder={t("ordenes.ejemploNotas")} {...register("notes")} />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{t("ordenes.items")} *</p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setEscaneando(true)} isLoading={buscando}>
                                <ViewfinderCircleIcon className="h-3.5 w-3.5" />
                                {t("escaner.escanear")}
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => append({ productName: "", quantity: 1, unitPrice: 0 })}
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                {t("ordenes.agregarItem")}
                            </Button>
                        </div>
                    </div>
                    {avisoDeEscaneo && <p role="alert" className="mb-2 text-sm text-danger">{avisoDeEscaneo}</p>}
                    <div className="space-y-3">
                        {fields.map((field, idx) => (
                            <div key={field.id} className="grid grid-cols-2 gap-2 items-end border border-border rounded-lg p-3 bg-surface-muted md:grid-cols-12">
                                <div className="col-span-2 md:col-span-4">
                                    <BuscadorDeProducto
                                        seleccionado={elegidos.get(lineas[idx]?.productId ?? "") ?? null}
                                        onSeleccionar={(product) => elegirProducto(idx, product)}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-3">
                                    <Input
                                        label={t("comun.nombre")}
                                        placeholder={t("ordenes.nombreItem")}
                                        error={te(errors.items?.[idx]?.productName?.message)}
                                        {...register(`items.${idx}.productName`, {
                                            required: "validacion.obligatorio" satisfies Clave,
                                        })}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <Input
                                        label={t("ordenes.cantidadCorta")}
                                        type="number"
                                        min="1"
                                        error={te(errors.items?.[idx]?.quantity?.message)}
                                        {...register(`items.${idx}.quantity`, {
                                            // Se valida la **suma** del producto, no la línea: dos líneas
                                            // de 3 sobre 5 disponibles no caben aunque cada una sí.
                                            validate: (_valor, valores) => {
                                                const productId = valores.items[idx]?.productId;
                                                if (!productId || !disponiblePorProducto.has(productId)) return true;
                                                const suma = valores.items
                                                    .filter((l) => l.productId === productId)
                                                    .reduce((s, l) => s + (Number(l.quantity) || 0), 0);
                                                return suma <= disponiblePorProducto.get(productId)! || ("ventas.form.superaDisponible" satisfies Clave);
                                            },
                                            onChange: () => {
                                                if (errors.items) void trigger("items");
                                            },
                                        })}
                                    />
                                    {lineas[idx]?.productId && disponiblePorProducto.has(lineas[idx].productId!) && !errors.items?.[idx]?.quantity && (
                                        <p className={cn("mt-1 text-xs", superaDisponible(lineas[idx].productId) ? "text-danger" : "text-foreground-muted")}>
                                            {t("ventas.form.disponible", { cantidad: disponiblePorProducto.get(lineas[idx].productId!)! })}
                                        </p>
                                    )}
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <Input label={t("ordenes.precioUnitario")} type="number" step="0.01" min="0" {...register(`items.${idx}.unitPrice`)} />
                                </div>
                                <div className="col-span-2 flex justify-end md:col-span-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className={CLASES_BOTON_ICONO}
                                        disabled={fields.length === 1}
                                        onClick={() => remove(idx)}
                                    >
                                        <TrashIcon className="h-4 w-4 text-danger" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={cerrar}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={createMutation.isPending}>{t("ordenes.crear")}</Button>
                </div>
            </form>
            {/* Fuera del `<form>`: el escáner lleva el suyo, y su envío subiría hasta este. */}
            <EscanerModal isOpen={escaneando} onClose={() => setEscaneando(false)} onCodigo={handleCodigo} />
        </Modal>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

// Mismo tamaño de página que productos y órdenes de compra.
const PAGE_SIZE = 10;

export default function SaleOrdersPage() {
    const { t, tn, idioma } = useT();
    const [formOpen, setFormOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [ordenACancelar, setOrdenACancelar] = useState<SaleOrder | null>(null);

    // T5-13 — cada botón por su ruta: el almacén envía, pero no crea, cancela ni borra.
    const puede = usePuede();
    const puedeEnviar = puede("POST /sale-orders/:id/ship");
    const puedeEditar = puede("PATCH /sale-orders/:id");
    const puedeBorrar = puede("DELETE /sale-orders/:id");

    // T6-01 — la página llamaba a `useSaleOrders()` sin nada y la API responde diez: una orden
    // que no estuviera entre las diez últimas no se alcanzaba desde aquí. Los filtros van al
    // servidor, en el `where`; filtrar lo ya cargado solo filtraría la página que se ve.
    const [page, setPage] = useState(1);
    const [estado, setEstado] = useState<SaleOrderStatus | "">("");
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    // T6-04 — buscar por número. Se admite pegado como se lee, con la `#` y con sus ceros; al
    // servidor van solo las cifras, y cuando se deja de teclear.
    const [numero, setNumero] = useState("");
    const cifras = numero.trim().replace(/^#/, "");
    const numeroInvalido = !SOLO_CIFRAS.test(cifras);
    const numeroBuscado = useDebounce(cifras, 300);
    const hayFiltros = estado !== "" || desde !== "" || hasta !== "" || numero !== "";
    // Cambiar un filtro vuelve a la página 1: la 3 de «todas» puede no existir en «enviadas».
    const filtrar = (cambio: () => void) => { cambio(); setPage(1); };

    // Un rango al revés no se envía —el servidor lo rechazaría con 400—: se dice en el campo y
    // la lista se queda como estaba hasta que se corrija.
    const rangoInvalido = desde !== "" && hasta !== "" && desde > hasta;

    const { data, isLoading } = useSaleOrders(
        { page, limit: PAGE_SIZE, number: numeroBuscado || undefined, status: estado || undefined, from: desde || undefined, to: hasta || undefined },
        // Lo mismo con un número mal escrito —el servidor respondería 400—. Se mira también el
        // valor retardado: al corregir el campo, durante un instante todavía es el anterior.
        { enabled: !rangoInvalido && !numeroInvalido && SOLO_CIFRAS.test(numeroBuscado) },
    );
    const orders = data?.data ?? [];
    const total = data?.meta.total ?? 0;
    const totalPages = data?.meta.totalPages ?? 1;
    const updateMutation = useUpdateSaleOrder();
    const shipMutation = useShipSaleOrder();
    const deleteMutation = useDeleteSaleOrder();

    // Si se borra la última orden de la última página, esa página deja de existir: se
    // retrocede en el propio evento, como en las órdenes de compra.
    const handleDelete = (id: string) => {
        const eraLaUnica = orders.length === 1 && page > 1;
        deleteMutation.mutate(id, {
            onSuccess: () => {
                if (eraLaUnica) setPage((p) => p - 1);
            },
        });
    };

    const handleShip = (id: string) => shipMutation.mutate(id);
    const handleCancel = (id: string) => updateMutation.mutate({ id, dto: { status: "CANCELLED" } });

    // La orden enviada se cancela desde el diálogo, no desde la fila: es la única de las
    // acciones de esta página que mueve inventario.
    const confirmarCancelacionDeEnvio = () => {
        if (!ordenACancelar) return;
        updateMutation.mutate(
            { id: ordenACancelar.id, dto: { status: "CANCELLED" } },
            { onSuccess: () => setOrdenACancelar(null) },
        );
    };

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.ordenesVenta")}</h1>
                    {/* `meta.total`, no `orders.length`: lo segundo es el tamaño de la página. */}
                    <p className="text-sm text-foreground-muted mt-1">{tn("ordenes.cantidad", total)}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {/* La exportación es solo de ADMIN en la API; antes el botón salía a todos y
                        a los demás les devolvía un 403. */}
                    {puede("GET /sale-orders/export") && (
                        <DropdownButton
                            label={t("ordenes.exportar")}
                            icon={ArrowDownTrayIcon}
                            items={[{ label: t("ordenes.exportarCsv"), onClick: exportSaleOrdersCsv }]}
                        />
                    )}
                    {puede("POST /sale-orders") && (
                        <Button onClick={() => setFormOpen(true)}>
                            <PlusIcon className="h-4 w-4" />
                            {t("ordenes.nueva")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Los filtros se pintan si hay órdenes o si hay un filtro puesto: si desaparecieran
                al quedarse sin resultados, no habría forma de deshacer el que los vació. */}
            {(total > 0 || hayFiltros) && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                    {/* Como el filtro de estado: sin etiqueta visible, que la pista ya dice qué
                        es. La de `Input` es la de un formulario, más grande que la de las fechas. */}
                    <Input
                        aria-label={t("ventas.filtro.numero")}
                        placeholder={t("ventas.filtro.numero")}
                        className="bg-surface"
                        inputMode="numeric"
                        autoComplete="off"
                        value={numero}
                        onChange={(e) => filtrar(() => setNumero(e.target.value))}
                        error={numeroInvalido ? t("ventas.filtro.numeroInvalido") : undefined}
                    />
                    {/* Sin etiqueta visible, como el filtro de tipo de los movimientos: «Todos los
                        estados» ya dice qué es, y el nombre accesible va en `aria-label`. */}
                    <Select
                        aria-label={t("ventas.filtro.estado")}
                        options={[
                            { value: "", label: t("ventas.filtro.todosLosEstados") },
                            // Del descriptor, para que el filtro y la insignia de la fila digan lo mismo.
                            ...Object.entries(ESTADO_ORDEN_VENTA).map(([value, { clave }]) => ({ value, label: t(clave) })),
                        ]}
                        value={estado}
                        onChange={(e) => filtrar(() => setEstado(e.target.value as SaleOrderStatus | ""))}
                    />
                    <CampoDeFecha
                        label={t("ventas.filtro.desde")}
                        value={desde}
                        onChange={(e) => filtrar(() => setDesde(e.target.value))}
                    />
                    <CampoDeFecha
                        label={t("ventas.filtro.hasta")}
                        value={hasta}
                        onChange={(e) => filtrar(() => setHasta(e.target.value))}
                        error={rangoInvalido ? t("ventas.filtro.rangoInvalido") : undefined}
                    />
                    {hayFiltros && (
                        <Button
                            variant="secondary"
                            onClick={() => filtrar(() => { setNumero(""); setEstado(""); setDesde(""); setHasta(""); })}
                        >
                            {t("ventas.filtro.limpiar")}
                        </Button>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : orders.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">
                    {t(hayFiltros ? "ventas.sinResultados" : "ventas.vacio")}
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-surface rounded-xl border border-border overflow-hidden">
                            <div
                                className="flex flex-col gap-3 px-4 py-4 cursor-pointer hover:bg-surface-muted transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="shrink-0"><EstadoBadge estado={buscarEstado(ESTADO_ORDEN_VENTA, order.status)} /></span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {t("ventas.numero", { numero: numeroDeOrden(order) })}
                                        </p>
                                        <p className="text-xs text-foreground-muted">
                                            {/* T5-06 — con cliente, el nombre lleva a su ficha. El clic no
                                                despliega la fila: es un destino, no un conmutador. */}
                                            {order.customerId ? (
                                                <Link
                                                    to={`/customers/${order.customerId}`}
                                                    className="text-accent underline underline-offset-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {order.customerName ?? t("ventas.clienteSinNombre")}
                                                </Link>
                                            ) : (
                                                order.customerName ?? t("ventas.clienteSinNombre")
                                            )}{" "}
                                            · {formatearFecha(idioma, order.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4 sm:shrink-0 sm:justify-end">
                                    <div className="sm:text-right">
                                        <p className="text-sm font-semibold text-foreground tabular-nums">
                                            {formatearImporte(order.total)}
                                        </p>
                                        <p className="text-xs text-foreground-muted">{tn("ordenes.items", order.items.length)}</p>
                                    </div>
                                    {order.status === "PENDING" && (puedeEnviar || puedeEditar || puedeBorrar) && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            {/* El nombre accesible nombra **la orden**: tres
                                                botones de icono repetidos por fila se anuncian
                                                todos igual, y no hay forma de saber sobre cuál
                                                se actúa. El `title` se queda para el ratón. */}
                                            {puedeEnviar && (
                                                <Button
                                                    variant="ghost"
                                                    className={CLASES_BOTON_ICONO}
                                                    title={t("ventas.marcarEnviada")}
                                                    aria-label={t("ventas.marcarEnviadaDe", { numero: numeroDeOrden(order) })}
                                                    isLoading={shipMutation.isPending}
                                                    onClick={() => handleShip(order.id)}
                                                >
                                                    <TruckIcon className="h-4 w-4 text-success" />
                                                </Button>
                                            )}
                                            {puedeEditar && (
                                                <Button
                                                    variant="ghost"
                                                    className={CLASES_BOTON_ICONO}
                                                    title={t("compras.cancelarOrden")}
                                                    aria-label={t("ventas.cancelarDe", { numero: numeroDeOrden(order) })}
                                                    isLoading={updateMutation.isPending}
                                                    onClick={() => handleCancel(order.id)}
                                                >
                                                    <XMarkIcon className="h-4 w-4 text-warning" />
                                                </Button>
                                            )}
                                            {puedeBorrar && (
                                                <Button
                                                    variant="ghost"
                                                    className={CLASES_BOTON_ICONO}
                                                    title={t("comun.eliminar")}
                                                    aria-label={t("ventas.eliminarDe", { numero: numeroDeOrden(order) })}
                                                    isLoading={deleteMutation.isPending}
                                                    onClick={() => handleDelete(order.id)}
                                                >
                                                    <TrashIcon className="h-4 w-4 text-danger" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {/* T2-42: una orden enviada también se puede cancelar, y eso repone
                                        el stock (T0-03). No lleva «Eliminar»: el backend no permite
                                        borrar una orden ya enviada. */}
                                    {puedeEditar && order.status === "SHIPPED" && (
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                className={CLASES_BOTON_ICONO}
                                                title={t("ventas.cancelarEnviada")}
                                                aria-label={t("ventas.cancelarEnviadaDe", { numero: numeroDeOrden(order) })}
                                                onClick={() => setOrdenACancelar(order)}
                                            >
                                                <XMarkIcon className="h-4 w-4 text-warning" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {expandedId === order.id && (
                                <div className="border-t border-border px-5 py-4">
                                    {(order.customerEmail || order.customerPhone) && (
                                        <div className="flex gap-4 mb-3 text-xs text-foreground-muted">
                                            {order.customerEmail && <span>✉ {order.customerEmail}</span>}
                                            {order.customerPhone && <span>📞 {order.customerPhone}</span>}
                                        </div>
                                    )}
                                    {order.notes && (
                                        <p className="text-xs text-foreground-muted mb-3 italic">"{order.notes}"</p>
                                    )}
                                    <div className={CLASES_TABLA_DESPLAZABLE}>
                                        <table className={CLASES_TABLA}>
                                            <thead className="text-left text-xs font-medium uppercase tracking-wide text-foreground-muted border-b border-border">
                                                <tr>
                                                    <th className="pb-2">{t("ordenes.producto")}</th>
                                                    <th className="pb-2 text-right">{t("ordenes.cantidadCorta")}</th>
                                                    <th className="pb-2 text-right">{t("ordenes.precioUnitario")}</th>
                                                    <th className="pb-2 text-right">{t("ordenes.subtotal")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {order.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="py-2 text-foreground">{item.productName}</td>
                                                        <td className="py-2 text-right text-foreground-muted">{item.quantity}</td>
                                                        <td className="py-2 text-right text-foreground-muted">{formatearImporte(item.unitPrice)}</td>
                                                        <td className="py-2 text-right font-medium text-foreground">
                                                            {formatearImporte(item.subtotal)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <PieDeImportes order={order} />
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Paginacion page={page} totalPages={totalPages} onPage={setPage} />

            <OrderFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} />
            <CancelarEnvioModal
                orden={ordenACancelar}
                isPending={updateMutation.isPending}
                onConfirm={confirmarCancelacionDeEnvio}
                onClose={() => setOrdenACancelar(null)}
            />
        </div>
    );
}
