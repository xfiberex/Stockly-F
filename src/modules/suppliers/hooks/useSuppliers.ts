import { useQuery } from "@tanstack/react-query";
import { SuppliersAPI } from "@/modules/suppliers/api/suppliers.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useSuppliers() {
    return useQuery({
        queryKey: queryKeys.suppliers,
        queryFn: SuppliersAPI.getAll,
        staleTime: 5 * 60 * 1000,
    });
}
