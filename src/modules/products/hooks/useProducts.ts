import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/product.api";
import type { ProductQuery } from "../types/product.types";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useProducts = (params?: ProductQuery, { enabled = true }: { enabled?: boolean } = {}) => {
    return useQuery({
        queryKey: [...queryKeys.product, params],
        queryFn: () => getProducts(params),
        enabled,
    });
};
