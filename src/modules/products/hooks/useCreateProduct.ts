import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useCreateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Producto creado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
