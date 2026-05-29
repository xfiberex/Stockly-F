import { useQuery } from "@tanstack/react-query";
import { getProductMovements } from "@/modules/products/api/product.api";

export function useStockMovements(productId: string) {
    return useQuery({
        queryKey: ["movements", productId],
        queryFn: () => getProductMovements(productId),
        enabled: !!productId,
    });
}
