import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { useManualMovement } from "@/modules/products/hooks/useManualMovement";
import type { Product } from "@/modules/products/types/product.types";

const REASONS = {
    IN: ["Compra a proveedor", "Devolución de cliente", "Ajuste positivo", "Producción propia", "Otro"],
    OUT: ["Venta", "Merma o deterioro", "Pérdida o robo", "Ajuste negativo", "Otro"],
    ADJUSTMENT: ["Inventario físico", "Corrección de error", "Otro"],
};

const schema = z.object({
    type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.coerce.number().int().positive("Debe ser mayor a 0"),
    reason: z.string().min(1, "El motivo es obligatorio"),
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
    const mutation = useManualMovement(product.id);

    const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormInput, unknown, FormData>({
        resolver: zodResolver(schema),
        defaultValues: { type: "IN", quantity: 1, reason: "" },
    });

    const selectedType = useWatch({ control, name: "type", defaultValue: "IN" as const });

    const reasonOptions = [
        { value: "", label: "Seleccionar motivo..." },
        ...REASONS[selectedType].map((r) => ({ value: r, label: r })),
    ];

    const typeOptions = [
        { value: "IN", label: "Entrada (+)" },
        { value: "OUT", label: "Salida (-)" },
        { value: "ADJUSTMENT", label: "Ajuste (stock objetivo)" },
    ];

    const handleClose = () => { reset(); onClose(); };

    const onSubmit = (data: FormData) => {
        mutation.mutate(data, { onSuccess: handleClose });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Registrar movimiento" className="max-w-md">
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-gray-500">Stock actual: <span className="font-semibold">{product.stock}</span></p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Select
                    id="type"
                    label="Tipo de movimiento"
                    options={typeOptions}
                    error={errors.type?.message}
                    {...register("type")}
                />
                <Input
                    id="quantity"
                    label={selectedType === "ADJUSTMENT" ? "Nuevo stock objetivo" : "Cantidad"}
                    type="number"
                    min="1"
                    placeholder={selectedType === "ADJUSTMENT" ? "Ej: 50" : "Ej: 10"}
                    error={errors.quantity?.message}
                    {...register("quantity")}
                />
                <Select
                    id="reason"
                    label="Motivo *"
                    options={reasonOptions}
                    error={errors.reason?.message}
                    {...register("reason")}
                />
                <Input
                    id="note"
                    label="Nota adicional"
                    placeholder="Detalle opcional..."
                    error={errors.note?.message}
                    {...register("note")}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit" isLoading={mutation.isPending}>Registrar</Button>
                </div>
            </form>
        </Modal>
    );
}
