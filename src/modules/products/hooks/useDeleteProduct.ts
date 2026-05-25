import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { deleteProduct } from "../api/product.api";
import { PRODUCTS_KEY } from "./useProducts";

// Hook para eliminar un producto existente
export const useDeleteProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
            toast.success("Producto eliminado");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
