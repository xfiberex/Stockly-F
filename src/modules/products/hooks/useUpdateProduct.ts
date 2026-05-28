import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { updateProduct } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export const useUpdateProduct = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            toast.success("Producto actualizado correctamente");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
};
