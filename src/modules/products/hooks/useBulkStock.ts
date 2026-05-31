import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { bulkUpdateStock } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { BulkStockDto } from "../types/product.types";

export function useBulkStock() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (dto: BulkStockDto) => bulkUpdateStock(dto),
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            const failed = results.filter((r) => !r.success).length;
            if (failed > 0) {
                toast.warning(`Ajuste completado con ${failed} error(es)`);
            } else {
                toast.success(`Stock actualizado en ${results.length} productos`);
            }
        },
        onError: () => {
            toast.error("Error al realizar el ajuste masivo");
        },
    });
}
