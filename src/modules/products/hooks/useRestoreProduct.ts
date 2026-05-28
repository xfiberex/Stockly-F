import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { restoreProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useRestoreProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Producto restaurado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
