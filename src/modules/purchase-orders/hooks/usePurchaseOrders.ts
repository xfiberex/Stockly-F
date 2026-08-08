import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
    getPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
} from "../api/purchase-orders.api";
import type { CreatePurchaseOrderForm, PurchaseOrderQuery } from "../types/purchase-orders.types";

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
    return useMutation({
        mutationFn: (dto: CreatePurchaseOrderForm) => createPurchaseOrder(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success("Orden de compra creada");
        },
        onError: () => toast.error("Error al crear la orden"),
    });
}

export function useUpdatePurchaseOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: { supplierId?: string; notes?: string; status?: string } }) =>
            updatePurchaseOrder(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success("Orden actualizada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al actualizar la orden"),
    });
}

export function useDeletePurchaseOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePurchaseOrder(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEY });
            toast.success("Orden eliminada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al eliminar la orden"),
    });
}
