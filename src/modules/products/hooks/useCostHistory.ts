import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getCostHistory } from "@/modules/products/api/product.api";

/**
 * T5-01 — el histórico de costes, paginado por el servidor.
 *
 * La página entra en la clave de caché por lo mismo que en `useStockMovements`: sin ella,
 * cambiar de página devolvería la que ya estaba cacheada y la tabla no se movería.
 */
export function useCostHistory(productId: string, page = 1) {
    return useQuery({
        queryKey: ["cost-history", productId, page],
        queryFn: () => getCostHistory(productId, page),
        enabled: !!productId,
        placeholderData: keepPreviousData,
    });
}
