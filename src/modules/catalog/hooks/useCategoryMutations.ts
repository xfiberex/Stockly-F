import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { CategoriesAPI } from "@/modules/catalog/api/catalog.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useCreateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CategoriesAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.categories });
            toast.success("Categoría creada correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CategoriesAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.categories });
            // Invalidar productos también para que se actualicen los nombres
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Categoría actualizada correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: CategoriesAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.categories });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Categoría eliminada correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
