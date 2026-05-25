import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { updateProduct } from "../api/product.api";
import { PRODUCTS_KEY } from "./useProducts";

// Hook para actualizar un producto existente
export const useUpdateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
            toast.success("Producto actualizado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
