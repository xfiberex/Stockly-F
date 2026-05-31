import { useQuery } from "@tanstack/react-query";
import { BrandsAPI } from "@/modules/catalog/api/catalog.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useBrands() {
    return useQuery({
        queryKey: queryKeys.brands,
        queryFn: BrandsAPI.getAll,
        staleTime: 5 * 60 * 1000,
    });
}
