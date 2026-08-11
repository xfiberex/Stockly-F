import { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useBulkStock } from "@/modules/products/hooks/useBulkStock";
import type { Product } from "@/modules/products/types/product.types";
import { useT } from "@/shared/hooks/useIdioma";

interface BulkStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    selectedIds: Set<string>;
}

export function BulkStockModal({ isOpen, onClose, products, selectedIds }: BulkStockModalProps) {
    const { t, tn } = useT();
    const mutation = useBulkStock();
    const [stockValues, setStockValues] = useState<Record<string, string>>({});
    // El motivo se **guarda** con el movimiento, así que su valor inicial sale del idioma
    // que hubiera al abrir el modal y no se recalcula: es un dato que el usuario puede
    // editar, no un rótulo. Ver `ManualMovementModal`, donde pasa lo mismo con la lista.
    const [reason, setReason] = useState(() => t("ajusteMasivo.motivoPorDefecto"));

    const selectedProducts = products.filter((p) => selectedIds.has(p.id));

    const handleClose = () => {
        setStockValues({});
        setReason(t("ajusteMasivo.motivoPorDefecto"));
        onClose();
    };

    const handleSubmit = () => {
        const items = selectedProducts
            .filter((p) => stockValues[p.id] !== undefined && stockValues[p.id] !== "")
            .map((p) => ({ productId: p.id, stock: parseInt(stockValues[p.id], 10) }));

        if (items.length === 0) return;

        mutation.mutate({ items, reason: reason || undefined }, { onSuccess: handleClose });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={tn("ajusteMasivo.titulo", selectedProducts.length)} className="max-w-lg">
            <div className="space-y-4">
                <Input
                    id="reason"
                    label={t("ajusteMasivo.motivo")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("ajusteMasivo.ejemploMotivo")}
                />

                <div className="max-h-80 overflow-y-auto space-y-2">
                    {selectedProducts.map((product) => (
                        <div key={product.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                                <p className="text-xs text-foreground-muted">{t("ajusteMasivo.stockActual", { stock: product.stock })}</p>
                            </div>
                            <div className="w-24 shrink-0">
                                <Input
                                    id={`stock-${product.id}`}
                                    type="number"
                                    min="0"
                                    placeholder={String(product.stock)}
                                    value={stockValues[product.id] ?? ""}
                                    onChange={(e) => setStockValues((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-xs text-foreground-muted">{t("ajusteMasivo.ayuda")}</p>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>{t("comun.cancelar")}</Button>
                    <Button
                        type="button"
                        isLoading={mutation.isPending}
                        onClick={handleSubmit}
                        disabled={Object.values(stockValues).every((v) => v === "")}
                    >
                        {t("ajusteMasivo.aplicar")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
