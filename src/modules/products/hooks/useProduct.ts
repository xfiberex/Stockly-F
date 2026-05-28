import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

// Define el hook useProduct que acepta un ID de producto y devuelve los datos del producto correspondiente
export const useProduct = (id: string) => {
    return useQuery({
        queryKey: [queryKeys.product, id],
        queryFn: () => getProduct(id),
        enabled: !!id,
    });
};