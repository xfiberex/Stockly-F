import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { updateProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const useUpdateProduct = () => {
    const queryClient = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: updateProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("productos.actualizado"));
        },
        onError: (error) => {
            toast.error(mensajeDeError(idioma, error));
        },
    });
};
