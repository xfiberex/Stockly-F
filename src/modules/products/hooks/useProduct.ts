import { useQuery } from "@tanstack/react-query";
import { getProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useProduct = (id: string) => {
    return useQuery({
        queryKey: [...queryKeys.product, id],
        queryFn: () => getProduct(id),
        enabled: !!id,
    });
};