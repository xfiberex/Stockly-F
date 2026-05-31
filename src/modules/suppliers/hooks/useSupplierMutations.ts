import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { SuppliersAPI } from "@/modules/suppliers/api/suppliers.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useCreateSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: SuppliersAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.suppliers });
            toast.success("Proveedor creado correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function useUpdateSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: SuppliersAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.suppliers });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Proveedor actualizado correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}

export function useDeleteSupplier() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: SuppliersAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.suppliers });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Proveedor eliminado correctamente");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
