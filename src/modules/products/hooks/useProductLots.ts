import { useQuery } from "@tanstack/react-query";
import { getProductLots } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

/**
 * T5-15 — los lotes con existencias de un producto. La clave cuelga de la de productos: todo
 * lo que mueve stock ya la invalida, así que la lista no se queda vieja tras una venta.
 */
export function useProductLots(productId: string, activa = true) {
    return useQuery({
        queryKey: [...queryKeys.product, productId, "lots"],
        queryFn: () => getProductLots(productId),
        enabled: activa,
    });
}
