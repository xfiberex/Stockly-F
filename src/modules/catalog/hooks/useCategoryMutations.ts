import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { CategoriesAPI } from "@/modules/catalog/api/catalog.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useCreateCategory() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: CategoriesAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.categories });
            toast.success(t("catalogo.categorias.creada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdateCategory() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: CategoriesAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.categories });
            // Invalidar productos también para que se actualicen los nombres
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("catalogo.categorias.actualizada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeleteCategory() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: CategoriesAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.categories });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("catalogo.categorias.eliminada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
