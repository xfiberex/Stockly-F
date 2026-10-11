import { Badge } from "@/shared/components/Badge";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import { formatearDia } from "@/shared/lib/fechas";
import { cuandoCaduca, tonoDeCaducidad } from "@/shared/lib/lotes";
import { useProductLots } from "@/modules/products/hooks/useProductLots";
import { useAlmacenes } from "@/modules/warehouses/hooks/useWarehouses";

/**
 * T5-15 — los lotes con existencias de un producto, **en el orden en que salen**: lo que no
 * tiene lote primero, y después del que caduca antes al que caduca después.
 *
 * Con varios almacenes, cada lote dice además dónde está: es lo que hace falta para ir a
 * buscar el que hay que retirar. Los lotes agotados no vienen —su rastro es el histórico—.
 */
export function LotesDelProducto({ productId }: { productId: string }) {
    const traductor = useT();
    const { t, idioma } = traductor;
    const { hayVarios, nombreDe } = useAlmacenes();
    const { data, isLoading } = useProductLots(productId);

    if (isLoading || !data) return <Spinner />;
    if (data.lots.length === 0 && data.withoutLot === 0) {
        return <p className="text-foreground-muted">{t("lotes.ninguno")}</p>;
    }

    return (
        <ul className="space-y-2">
            {data.withoutLot !== 0 && (
                <li className="flex justify-between gap-3 text-foreground">
                    <span>{t("lotes.sinLote")}</span>
                    <span className="shrink-0 tabular-nums">{data.withoutLot}</span>
                </li>
            )}
            {data.lots.map((lote) => (
                <li key={lote.id}>
                    <div className="flex justify-between gap-3 text-foreground">
                        <span className="min-w-0 break-words font-medium">{lote.code}</span>
                        <span className="shrink-0 tabular-nums">{lote.stock}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
                        <span>{formatearDia(idioma, lote.expiresAt)}</span>
                        <Badge variant={tonoDeCaducidad(lote.daysLeft)}>{cuandoCaduca(traductor, lote.daysLeft)}</Badge>
                    </div>
                    {hayVarios && (
                        <p className="text-xs text-foreground-muted">
                            {lote.levels.map((nivel) => `${nombreDe(nivel.warehouseId)}: ${nivel.stock}`).join(" · ")}
                        </p>
                    )}
                </li>
            ))}
        </ul>
    );
}
