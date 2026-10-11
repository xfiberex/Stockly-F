import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";
import { useManualMovement } from "@/modules/products/hooks/useManualMovement";
import { useProductLots } from "@/modules/products/hooks/useProductLots";
import type { Product, ProductLot } from "@/modules/products/types/product.types";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { stockEn } from "@/shared/lib/almacenes";
import { formatearDia } from "@/shared/lib/fechas";
import { LARGO_MAXIMO_DE_CODIGO_DE_LOTE, type NivelDeStock } from "@/shared/contratos";
import { SelectorDeAlmacen } from "@/modules/warehouses/components/SelectorDeAlmacen";
import { useAlmacenDeOperacion } from "@/modules/warehouses/hooks/useWarehouses";

/**
 * T4-04 — el motivo tiene dos caras: **lo que se ve** y **lo que se guarda**.
 *
 * El `reason` viaja a la API y queda escrito en el movimiento para siempre, así que su
 * valor no puede depender del idioma de quien lo registró: un histórico con la mitad de
 * los motivos en inglés no se puede filtrar ni agrupar. El valor se queda en el idioma de
 * referencia —es un dato— y lo que se traduce es la etiqueta de la lista.
 */
const MOTIVOS: Record<"IN" | "OUT" | "ADJUSTMENT", ReadonlyArray<{ valor: string; clave: Clave }>> = {
    IN: [
        { valor: "Compra a proveedor", clave: "movimientos.motivo.compraProveedor" },
        { valor: "Devolución de cliente", clave: "movimientos.motivo.devolucionCliente" },
        { valor: "Ajuste positivo", clave: "movimientos.motivo.ajustePositivo" },
        { valor: "Producción propia", clave: "movimientos.motivo.produccionPropia" },
        { valor: "Otro", clave: "movimientos.motivo.otro" },
    ],
    OUT: [
        { valor: "Venta", clave: "movimientos.motivo.venta" },
        { valor: "Merma o deterioro", clave: "movimientos.motivo.merma" },
        { valor: "Pérdida o robo", clave: "movimientos.motivo.perdida" },
        { valor: "Ajuste negativo", clave: "movimientos.motivo.ajusteNegativo" },
        { valor: "Otro", clave: "movimientos.motivo.otro" },
    ],
    ADJUSTMENT: [
        { valor: "Inventario físico", clave: "movimientos.motivo.inventarioFisico" },
        { valor: "Corrección de error", clave: "movimientos.motivo.correccion" },
        { valor: "Otro", clave: "movimientos.motivo.otro" },
    ],
};

/**
 * Los mensajes son claves; ver la cabecera de `auth.schema.ts`.
 *
 * T5-15 — dos reglas que son las del servidor, dichas junto al campo antes de enviar: cero
 * unidades solo vale en un ajuste —es como se da de baja un lote—, y la entrada de un producto
 * que lleva lotes dice su lote o su fecha de caducidad.
 */
const esquema = (llevaLotes: boolean) =>
    z
        .object({
            type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
            quantity: z.coerce.number().int().min(0, "validacion.cantidadNoNegativa" satisfies Clave),
            reason: z.string().min(1, "validacion.motivoRequerido" satisfies Clave),
            note: z.string().max(500).optional(),
            lotId: z.string().optional(),
            expiresAt: z.string().optional(),
            lotCode: z.string().max(LARGO_MAXIMO_DE_CODIGO_DE_LOTE, "validacion.loteLargo" satisfies Clave).optional(),
        })
        .superRefine((datos, ctx) => {
            if (datos.type !== "ADJUSTMENT" && datos.quantity < 1) {
                ctx.addIssue({ code: "custom", path: ["quantity"], message: "validacion.mayorQueCero" satisfies Clave });
            }
            if (llevaLotes && datos.type === "IN" && !datos.lotId && !datos.expiresAt) {
                ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "validacion.caducidadRequerida" satisfies Clave });
            }
        });

type Esquema = ReturnType<typeof esquema>;
type FormInput = z.input<Esquema>;
type FormData  = z.infer<Esquema>;

interface ManualMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** T5-14 — con su desglose por almacén, si quien abre el diálogo lo tiene: es el del catálogo. */
    product: Product & { stockLevels?: NivelDeStock[] };
}

export function ManualMovementModal({ isOpen, onClose, product }: ManualMovementModalProps) {
    const { t, te, idioma } = useT();
    const mutation = useManualMovement(product.id);
    // T5-14 — un movimiento ocurre en un almacén. Con varios se elige, y el stock que se
    // enseña —y al que se refiere un ajuste— es el de ese almacén, no el total.
    const almacen = useAlmacenDeOperacion();
    // T5-15 — los lotes solo se piden para un producto que los lleva, y con el diálogo abierto.
    const lotes = useProductLots(product.id, isOpen && product.tracksLots === true).data?.lots ?? [];

    const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormInput, unknown, FormData>({
        resolver: zodResolver(esquema(product.tracksLots)),
        defaultValues: { type: "IN", quantity: 1, reason: "", lotId: "", expiresAt: "", lotCode: "" },
    });

    const selectedType = useWatch({ control, name: "type", defaultValue: "IN" as const });
    const lotId = useWatch({ control, name: "lotId" }) ?? "";
    const caducidad = useWatch({ control, name: "expiresAt" }) ?? "";

    const reasonOptions = [
        { value: "", label: t("movimientos.elegirMotivo") },
        ...MOTIVOS[selectedType].map(({ valor, clave }) => ({ value: valor, label: t(clave) })),
    ];

    const typeOptions = [
        { value: "IN", label: t("movimientos.entrada") },
        { value: "OUT", label: t("movimientos.salida") },
        { value: "ADJUSTMENT", label: t("movimientos.ajuste") },
    ];

    /** Lo que hay de un lote **donde va a ocurrir el movimiento**: en el almacén elegido, o en total si solo hay uno. */
    const enEsteAlmacen = (lote: ProductLot) =>
        almacen.paraEnviar ? (lote.levels.find((n) => n.warehouseId === almacen.paraEnviar)?.stock ?? 0) : lote.stock;
    const opcionDe = (lote: ProductLot) => ({
        value: lote.id,
        label: t(lote.expired ? "lotes.opcionCaducada" : "lotes.opcion", {
            codigo: lote.code,
            fecha: formatearDia(idioma, lote.expiresAt),
            cantidad: enEsteAlmacen(lote),
        }),
    });
    // Una entrada puede sumar a cualquier lote del producto; una salida o un ajuste, solo a los
    // que tienen algo en este almacén. La primera opción es no elegir ninguno.
    const lotOptions = selectedType === "IN"
        ? [{ value: "", label: t("lotes.loteNuevo") }, ...lotes.map(opcionDe)]
        : [
            { value: "", label: t(selectedType === "OUT" ? "lotes.porOrdenDeCaducidad" : "lotes.todosLosLotes") },
            ...lotes.filter((lote) => enEsteAlmacen(lote) > 0).map(opcionDe),
        ];

    const handleClose = () => { reset(); onClose(); };

    const onSubmit = ({ lotId: lote, expiresAt, lotCode, ...data }: FormData) => {
        // El lote viaja de una de dos formas, nunca las dos: uno que existe, o —solo en una
        // entrada— la fecha y el código del que se crea.
        const deLote = !product.tracksLots
            ? {}
            : lote
                ? { lotId: lote }
                : data.type === "IN"
                    ? { expiresAt, lotCode: lotCode?.trim() || undefined }
                    : {};
        mutation.mutate({ ...data, ...deLote, warehouseId: almacen.paraEnviar }, { onSuccess: handleClose });
    };

    const etiquetaDeCantidad = selectedType !== "ADJUSTMENT"
        ? t("movimientos.cantidad")
        : lotId ? t("lotes.unidadesDelLote") : t("movimientos.stockObjetivo");

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t("movimientos.registrar")} className="max-w-md">
            <div className="mb-4 p-3 bg-surface-muted rounded-lg text-sm">
                <p className="font-medium text-foreground">{product.name}</p>
                <p className="text-foreground-muted">
                    {t(almacen.hayVarios ? "movimientos.stockEnAlmacen" : "productos.campo.stockActual")}:{" "}
                    <span className="font-semibold">{stockEn(product, almacen.paraEnviar)}</span>
                    {almacen.hayVarios && <> · {t("movimientos.stockTotal", { cantidad: product.stock })}</>}
                </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <SelectorDeAlmacen value={almacen.warehouseId} onChange={(id) => { almacen.setWarehouseId(id); setValue("lotId", ""); }} />
                <Select
                    id="type"
                    label={t("movimientos.tipo")}
                    options={typeOptions}
                    error={te(errors.type?.message)}
                    {...register("type", { onChange: () => setValue("lotId", "") })}
                />
                {product.tracksLots && (
                    <Select
                        id="lotId"
                        label={t("lotes.lote")}
                        options={lotOptions}
                        error={te(errors.lotId?.message)}
                        {...register("lotId")}
                    />
                )}
                {product.tracksLots && selectedType === "IN" && !lotId && (
                    <>
                        <p className="-mt-2 text-xs text-foreground-muted">{t("lotes.ayudaEntrada")}</p>
                        <div className="grid grid-cols-2 gap-3">
                            <CampoDeFecha
                                variante="formulario"
                                id="expiresAt"
                                label={`${t("lotes.caducidad")} *`}
                                value={caducidad}
                                error={te(errors.expiresAt?.message)}
                                {...register("expiresAt")}
                            />
                            <Input
                                id="lotCode"
                                label={t("lotes.codigoOpcional")}
                                placeholder={t("lotes.ejemploCodigo")}
                                autoComplete="off"
                                error={te(errors.lotCode?.message)}
                                {...register("lotCode")}
                            />
                        </div>
                    </>
                )}
                <Input
                    id="quantity"
                    label={etiquetaDeCantidad}
                    type="number"
                    min={selectedType === "ADJUSTMENT" ? "0" : "1"}
                    placeholder={selectedType === "ADJUSTMENT" ? t("movimientos.ejemploObjetivo") : t("movimientos.ejemploCantidad")}
                    error={te(errors.quantity?.message)}
                    {...register("quantity")}
                />
                <Select
                    id="reason"
                    label={`${t("movimientos.motivo")} *`}
                    options={reasonOptions}
                    error={te(errors.reason?.message)}
                    {...register("reason")}
                />
                <Input
                    id="note"
                    label={t("movimientos.nota")}
                    placeholder={t("movimientos.ejemploNota")}
                    error={te(errors.note?.message)}
                    {...register("note")}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={mutation.isPending}>{t("movimientos.registrarBoton")}</Button>
                </div>
            </form>
        </Modal>
    );
}
