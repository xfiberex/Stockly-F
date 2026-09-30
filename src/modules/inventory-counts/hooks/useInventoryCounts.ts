import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { queryKeys } from "@/shared/constants/queryKeys";
import {
    cancelInventoryCount,
    closeInventoryCount,
    createInventoryCount,
    getInventoryCount,
    getInventoryCountLines,
    getInventoryCounts,
    recordInventoryCountLines,
} from "../api/inventory-counts.api";
import type { CountedLine, InventoryCountLinesQuery, InventoryCountsQuery, NewInventoryCount } from "../types/inventory-counts.types";

const CLAVE = queryKeys.inventoryCounts;

export function useInventoryCounts(params?: InventoryCountsQuery) {
    return useQuery({ queryKey: [...CLAVE, "lista", params], queryFn: () => getInventoryCounts(params) });
}

export function useInventoryCount(id: string) {
    return useQuery({ queryKey: [...CLAVE, id], queryFn: () => getInventoryCount(id) });
}

export function useInventoryCountLines(id: string, params: InventoryCountLinesQuery) {
    return useQuery({
        queryKey: [...CLAVE, id, "lineas", params],
        queryFn: () => getInventoryCountLines(id, params),
        // Cambiar de página o de filtro no vacía la tabla mientras llega la siguiente.
        placeholderData: keepPreviousData,
    });
}

export function useCreateInventoryCount() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (dto: NewInventoryCount) => createInventoryCount(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CLAVE });
            toast.success(t("conteos.abierto"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

/** Anotar cambia las cifras de la sesión y sus líneas; el stock, todavía no. */
export function useRecordInventoryCountLines(id: string) {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (items: CountedLine[]) => recordInventoryCountLines(id, items),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [...CLAVE, id] });
            qc.invalidateQueries({ queryKey: [...CLAVE, "lista"] });
            toast.success(t("conteos.anotadas"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

/** Cerrar mueve stock: la lista de productos en caché deja de valer. */
export function useCloseInventoryCount(id: string) {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: () => closeInventoryCount(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CLAVE });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("conteos.cerrado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useCancelInventoryCount(id: string) {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: () => cancelInventoryCount(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: CLAVE });
            toast.success(t("conteos.cancelado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
