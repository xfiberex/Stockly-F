import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { importProducts } from "@/modules/products/api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { ImportProductDto } from "@/modules/products/types/product.types";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useImportProducts() {
    const qc = useQueryClient();
    const { tn, idioma } = useT();

    return useMutation({
        mutationFn: (products: ImportProductDto[]) => importProducts(products),
        onSuccess: (result) => {
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(tn("importacion.importados", result.created));
            if (result.errors.length > 0) {
                toast.warning(tn("importacion.filasConError", result.errors.length));
            }
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
