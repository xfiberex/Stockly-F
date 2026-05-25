import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { restoreProduct } from "../api/product.api";
import { PRODUCTS_KEY } from "./useProducts";

// Hook para restaurar un producto eliminado
export const useRestoreProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
            toast.success("Producto restaurado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
