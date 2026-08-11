import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { deleteProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const useDeleteProduct = () => {
    const queryClient = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("productos.eliminado"));
        },
        onError: (error) => {
            toast.error(mensajeDeError(idioma, error));
        },
    });
};
