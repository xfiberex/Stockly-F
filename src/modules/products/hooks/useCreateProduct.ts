import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const useCreateProduct = () => {
    const queryClient = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("productos.creado"));
        },
        onError: (error) => {
            toast.error(mensajeDeError(idioma, error));
        },
    });
};
