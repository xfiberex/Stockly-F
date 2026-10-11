import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { queryKeys } from "@/shared/constants/queryKeys";
import { createStockTransfer, getStockTransfer, getStockTransfers } from "../api/stock-transfers.api";
import type { NewStockTransfer, StockTransfersQuery } from "../types/stock-transfers.types";

const CLAVE = queryKeys.stockTransfers;

export function useStockTransfers(params?: StockTransfersQuery) {
    return useQuery({
        queryKey: [...CLAVE, "lista", params],
        queryFn: () => getStockTransfers(params),
        // Cambiar de página o de filtro no vacía la lista mientras llega la siguiente.
        placeholderData: keepPreviousData,
    });
}

/** Las líneas de una transferencia: se piden al desplegarla, no con la lista. */
export function useStockTransfer(id: string, { enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({ queryKey: [...CLAVE, id], queryFn: () => getStockTransfer(id), enabled });
}

/** Transferir mueve stock entre almacenes: la lista de productos y lo que guarda cada almacén dejan de valer. */
export function useCreateStockTransfer() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (dto: NewStockTransfer) => createStockTransfer(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CLAVE });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            // El historico de cada producto transferido tiene dos movimientos nuevos.
            qc.invalidateQueries({ queryKey: ["movements"] });
            toast.success(t("transferencias.registrada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
