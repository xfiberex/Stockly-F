import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/product.api";
import type { ProductQuery } from "../types/product.types";

// Define la constante PRODUCTS_KEY para usarla como clave en la consulta de React Query
export const PRODUCTS_KEY = "products";

// Define el hook useProducts que acepta un objeto de parámetros opcional para la consulta de productos
export const useProducts = (params?: ProductQuery) => {
    return useQuery({
        queryKey: [PRODUCTS_KEY, params],
        queryFn: () => getProducts(params),
    });
};