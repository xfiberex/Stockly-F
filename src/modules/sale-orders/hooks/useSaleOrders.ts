import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getSaleOrders, createSaleOrder, updateSaleOrder, deleteSaleOrder } from "../api/sale-orders.api";
import type { CreateSaleOrderDto, UpdateSaleOrderDto } from "../types/sale-orders.types";

export const SALE_ORDERS_KEY = ["sale-orders"] as const;

export function useSaleOrders() {
    return useQuery({ queryKey: SALE_ORDERS_KEY, queryFn: getSaleOrders });
}

export function useCreateSaleOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateSaleOrderDto) => createSaleOrder(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SALE_ORDERS_KEY });
            toast.success("Orden de venta creada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al crear la orden de venta"),
    });
}

export function useUpdateSaleOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateSaleOrderDto }) => updateSaleOrder(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SALE_ORDERS_KEY });
            toast.success("Orden actualizada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al actualizar la orden"),
    });
}

export function useDeleteSaleOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteSaleOrder(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SALE_ORDERS_KEY });
            toast.success("Orden eliminada");
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err?.response?.data?.message ?? "Error al eliminar la orden"),
    });
}
