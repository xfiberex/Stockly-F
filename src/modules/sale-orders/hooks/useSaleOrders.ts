import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { getSaleOrders, createSaleOrder, updateSaleOrder, deleteSaleOrder } from "../api/sale-orders.api";
import type { CreateSaleOrderDto, UpdateSaleOrderDto } from "../types/sale-orders.types";

export const SALE_ORDERS_KEY = ["sale-orders"] as const;

export function useSaleOrders() {
    return useQuery({ queryKey: SALE_ORDERS_KEY, queryFn: getSaleOrders });
}

export function useCreateSaleOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (dto: CreateSaleOrderDto) => createSaleOrder(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SALE_ORDERS_KEY });
            toast.success(t("ventas.creada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdateSaleOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateSaleOrderDto }) => updateSaleOrder(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SALE_ORDERS_KEY });
            toast.success(t("ordenes.actualizada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeleteSaleOrder() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (id: string) => deleteSaleOrder(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SALE_ORDERS_KEY });
            toast.success(t("ordenes.eliminada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
