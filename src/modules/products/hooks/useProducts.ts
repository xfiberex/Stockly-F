import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/product.api";
import type { ProductQuery } from "../types/product.types";
import { queryKeys } from "@/shared/constants/queryKeys";

// Define el hook useProducts que acepta un objeto de parámetros opcional para la consulta de productos
export const useProducts = (params?: ProductQuery) => {
    return useQuery({
        queryKey: [queryKeys.product, params],
        queryFn: () => getProducts(params),
    });
};