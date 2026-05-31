import { useQuery } from "@tanstack/react-query";
import { CategoriesAPI } from "@/modules/catalog/api/catalog.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useCategories() {
    return useQuery({
        queryKey: queryKeys.categories,
        queryFn: CategoriesAPI.getAll,
        staleTime: 5 * 60 * 1000,
    });
}
