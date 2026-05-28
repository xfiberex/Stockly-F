import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { deleteProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useDeleteProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Producto eliminado");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
