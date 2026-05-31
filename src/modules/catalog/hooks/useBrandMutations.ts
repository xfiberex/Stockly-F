import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { BrandsAPI } from "@/modules/catalog/api/catalog.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useCreateBrand() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: BrandsAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.brands });
            toast.success("Marca creada correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function useUpdateBrand() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: BrandsAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.brands });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Marca actualizada correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function useDeleteBrand() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: BrandsAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.brands });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Marca eliminada correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
