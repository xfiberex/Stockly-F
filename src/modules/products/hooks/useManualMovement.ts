import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createManualMovement } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useManualMovement(productId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: Parameters<typeof createManualMovement>[1]) =>
            createManualMovement(productId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            queryClient.invalidateQueries({ queryKey: ["movements", productId] });
            toast.success("Movimiento registrado correctamente");
        },
        onError: (err: { response?: { data?: { message?: string } } }) => {
            toast.error(err?.response?.data?.message ?? "Error al registrar el movimiento");
        },
    });
}
