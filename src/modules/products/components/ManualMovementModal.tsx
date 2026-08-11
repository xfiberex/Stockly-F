import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { useManualMovement } from "@/modules/products/hooks/useManualMovement";
import type { Product } from "@/modules/products/types/product.types";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";

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

// Los mensajes son claves; ver la cabecera de `auth.schema.ts`.
const schema = z.object({
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.coerce.number().int().positive("validacion.mayorQueCero" satisfies Clave),
    reason: z.string().min(1, "validacion.motivoRequerido" satisfies Clave),
    note: z.string().max(500).optional(),
});

type FormInput = z.input<typeof schema>;
type FormData  = z.infer<typeof schema>;

interface ManualMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
}

export function ManualMovementModal({ isOpen, onClose, product }: ManualMovementModalProps) {
    const { t, te } = useT();
    const mutation = useManualMovement(product.id);

    const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
        resolver: zodResolver(schema),
        defaultValues: { type: "IN", quantity: 1, reason: "" },
    });

    const selectedType = useWatch({ control, name: "type", defaultValue: "IN" as const });

    const reasonOptions = [
        { value: "", label: t("movimientos.elegirMotivo") },
        ...MOTIVOS[selectedType].map(({ valor, clave }) => ({ value: valor, label: t(clave) })),
    ];

    const typeOptions = [
        { value: "IN", label: t("movimientos.entrada") },
        { value: "OUT", label: t("movimientos.salida") },
        { value: "ADJUSTMENT", label: t("movimientos.ajuste") },
    ];

    const handleClose = () => { reset(); onClose(); };

    const onSubmit = (data: FormData) => {
        mutation.mutate(data, { onSuccess: handleClose });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={t("movimientos.registrar")} className="max-w-md">
            <div className="mb-4 p-3 bg-surface-muted rounded-lg text-sm">
                <p className="font-medium text-foreground">{product.name}</p>
                <p className="text-foreground-muted">{t("productos.campo.stockActual")}: <span className="font-semibold">{product.stock}</span></p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Select
                    id="type"
                    label={t("movimientos.tipo")}
                    options={typeOptions}
                    error={te(errors.type?.message)}
                    {...register("type")}
                />
                <Input
                    id="quantity"
                    label={selectedType === "ADJUSTMENT" ? t("movimientos.stockObjetivo") : t("movimientos.cantidad")}
                    type="number"
                    min="1"
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
