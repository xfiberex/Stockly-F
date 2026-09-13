import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { queryKeys } from "@/shared/constants/queryKeys";
import {
    getPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    receivePurchaseOrder,
} from "../api/purchase-orders.api";
import type { CreatePurchaseOrderForm, PurchaseOrderQuery, RecepcionForm } from "../types/purchase-orders.types";

const QUERY_KEY = ["purchase-orders"] as const;

export function usePurchaseOrders(params?: PurchaseOrderQuery) {
    return useQuery({
        // Los parámetros entran en la clave: cada página se cachea por separado.
        queryKey: [...QUERY_KEY, params],
        queryFn: () => getPurchaseOrders(params),
    });
}

export function useCreatePurchaseOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (dto: CreatePurchaseOrderForm) => createPurchaseOrder(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            // Crear, enviar, cancelar o recibir cambia stock, coste o disponible: la lista de
            // productos que está en caché ya no es la buena (T5-03).
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("compras.creada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdatePurchaseOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: { supplierId?: string; notes?: string; status?: string } }) =>
            updatePurchaseOrder(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            // Crear, enviar, cancelar o recibir cambia stock, coste o disponible: la lista de
            // productos que está en caché ya no es la buena (T5-03).
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("ordenes.actualizada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useReceivePurchaseOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: RecepcionForm }) => receivePurchaseOrder(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            // Una entrega suma stock y mueve el coste medio (T5-01).
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("compras.recepcion.registrada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeletePurchaseOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (id: string) => deletePurchaseOrder(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            // Crear, enviar, cancelar o recibir cambia stock, coste o disponible: la lista de
            // productos que está en caché ya no es la buena (T5-03).
            qc.invalidateQueries({ queryKey: queryKeys.product });
            toast.success(t("ordenes.eliminada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
