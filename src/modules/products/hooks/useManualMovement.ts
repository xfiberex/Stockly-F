import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { createManualMovement } from "../api/product.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useManualMovement(productId: string) {
    const queryClient = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (dto: Parameters<typeof createManualMovement>[1]) =>
            createManualMovement(productId, dto),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.product });
            queryClient.invalidateQueries({ queryKey: ["movements", productId] });
            toast.success(t("movimientos.registrado"));
        },
        // Era una de las quince lecturas a mano de `response.data.message`, que llega
        // siempre en español; ahora el `code` del sobre se traduce (T4-04).
        onError: (error) => {
            toast.error(mensajeDeError(idioma, error));
        },
    });
}
