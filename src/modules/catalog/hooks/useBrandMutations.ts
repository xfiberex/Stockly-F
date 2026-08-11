import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { BrandsAPI } from "@/modules/catalog/api/catalog.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useCreateBrand() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: BrandsAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.brands });
            toast.success(t("catalogo.marcas.creada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdateBrand() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: BrandsAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.brands });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("catalogo.marcas.actualizada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeleteBrand() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: BrandsAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.brands });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("catalogo.marcas.eliminada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
