import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createProduct } from "../api/product.api";
import { PRODUCTS_KEY } from "./useProducts";

// Hook para crear un nuevo producto
export const useCreateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
            toast.success("Producto creado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
