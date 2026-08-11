import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { bulkUpdateStock } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import type { BulkStockDto } from "../types/product.types";

export function useBulkStock() {
    const queryClient = useQueryClient();
    const { t, tn } = useT();

    return useMutation({
        mutationFn: (dto: BulkStockDto) => bulkUpdateStock(dto),
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            const failed = results.filter((r) => !r.success).length;
            if (failed > 0) {
                toast.warning(tn("ajusteMasivo.conErrores", failed));
            } else {
                toast.success(tn("ajusteMasivo.hecho", results.length));
            }
        },
        onError: () => {
            toast.error(t("ajusteMasivo.error"));
        },
    });
}
