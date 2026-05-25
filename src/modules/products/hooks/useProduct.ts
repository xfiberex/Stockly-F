import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../api/product.api";
import { PRODUCTS_KEY } from "./useProducts";

// Define el hook useProduct que acepta un ID de producto y devuelve los datos del producto correspondiente
export const useProduct = (id: string) => {
    return useQuery({
        queryKey: [PRODUCTS_KEY, id],
        queryFn: () => getProduct(id),
        enabled: !!id,
    });
};