import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getProductMovements } from "@/modules/products/api/product.api";
import type { MovementsQuery } from "@/modules/products/types/product.types";

/**
 * T4-15 — el histórico llega paginado y filtrado por el servidor.
 *
 * **La query entra en la clave de caché.** Si no lo hiciera, cambiar de página o de filtro
 * devolvería lo que ya había en caché para ese producto: la pantalla se quedaría quieta y
 * parecería que el filtro no funciona.
 *
 * `keepPreviousData` mantiene la página anterior mientras llega la siguiente. Sin él, cada
 * clic en «Siguiente» vacía la tabla y la sustituye por el spinner, que a 200 ms de red es
 * un parpadeo en cada paso.
 */
export function useStockMovements(productId: string, query: MovementsQuery = {}) {
    return useQuery({
        queryKey: ["movements", productId, query],
        queryFn: () => getProductMovements(productId, query),
        enabled: !!productId,
        placeholderData: keepPreviousData,
    });
}
