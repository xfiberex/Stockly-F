import { useQuery } from "@tanstack/react-query";
import { getPriceHistory } from "../api/product.api";

export function usePriceHistory(productId: string) {
    return useQuery({
        queryKey: ["price-history", productId],
        queryFn: () => getPriceHistory(productId),
        enabled: !!productId,
    });
}
