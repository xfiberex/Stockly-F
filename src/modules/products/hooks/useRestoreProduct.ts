import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { restoreProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const useRestoreProduct = () => {
    const queryClient = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: restoreProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("productos.restaurado"));
        },
        onError: (error) => {
            toast.error(mensajeDeError(idioma, error));
        },
    });
};
