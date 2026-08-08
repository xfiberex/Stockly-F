import { useState } from "react";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useBulkStock } from "@/modules/products/hooks/useBulkStock";
import type { Product } from "@/modules/products/types/product.types";

interface BulkStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    selectedIds: Set<string>;
}

export function BulkStockModal({ isOpen, onClose, products, selectedIds }: BulkStockModalProps) {
    const mutation = useBulkStock();
    const [stockValues, setStockValues] = useState<Record<string, string>>({});
    const [reason, setReason] = useState("Ajuste masivo de inventario");

    const selectedProducts = products.filter((p) => selectedIds.has(p.id));

    const handleClose = () => {
        setStockValues({});
        setReason("Ajuste masivo de inventario");
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
        <Modal isOpen={isOpen} onClose={handleClose} title={`Ajuste masivo (${selectedProducts.length} productos)`} className="max-w-lg">
            <div className="space-y-4">
                <Input
                    id="reason"
                    label="Motivo del ajuste"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: Inventario físico mensual"
                />

                <div className="max-h-80 overflow-y-auto space-y-2">
                    {selectedProducts.map((product) => (
                        <div key={product.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                                <p className="text-xs text-foreground-muted">Stock actual: {product.stock}</p>
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

                <p className="text-xs text-foreground-muted">Deja vacío para mantener el stock actual de un producto.</p>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button
                        type="button"
                        isLoading={mutation.isPending}
                        onClick={handleSubmit}
                        disabled={Object.values(stockValues).every((v) => v === "")}
                    >
                        Aplicar ajustes
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
