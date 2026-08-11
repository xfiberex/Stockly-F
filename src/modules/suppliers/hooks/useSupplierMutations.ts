import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { SuppliersAPI } from "@/modules/suppliers/api/suppliers.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useCreateSupplier() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: SuppliersAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.suppliers });
            toast.success(t("proveedores.creado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdateSupplier() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: SuppliersAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.suppliers });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("proveedores.actualizado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeleteSupplier() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: SuppliersAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.suppliers });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("proveedores.eliminado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
