import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { importProducts } from "@/modules/products/api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { ImportProductDto } from "@/modules/products/types/product.types";

export function useImportProducts() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (products: ImportProductDto[]) => importProducts(products),
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(`${result.created} producto${result.created !== 1 ? "s" : ""} importado${result.created !== 1 ? "s" : ""} correctamente`);
            if (result.errors.length > 0) {
                toast.warning(`${result.errors.length} fila${result.errors.length !== 1 ? "s" : ""} con errores omitidas`);
            }
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
