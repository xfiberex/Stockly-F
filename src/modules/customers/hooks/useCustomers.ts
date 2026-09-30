import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { CustomersAPI } from "@/modules/customers/api/customers.api";
import type { CustomersQuery } from "@/modules/customers/types/customer.types";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useCustomers(query: CustomersQuery, { enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: [...queryKeys.customers, "lista", query],
        queryFn: () => CustomersAPI.getAll(query),
        enabled,
        // Mientras llega la página siguiente o la búsqueda nueva se queda la anterior, en vez
        // de vaciar la tabla y volverla a llenar en cada tecla.
        placeholderData: keepPreviousData,
    });
}

export function useCustomer(id: string | undefined) {
    return useQuery({
        queryKey: [...queryKeys.customers, "ficha", id],
        queryFn: () => CustomersAPI.getById(id!),
        enabled: !!id,
    });
}

export function useCreateCustomer() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: CustomersAPI.create,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.customers });
            toast.success(t("clientes.creado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdateCustomer() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: CustomersAPI.update,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.customers });
            toast.success(t("clientes.actualizado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeleteCustomer() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: CustomersAPI.delete,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.customers });
            // Sus órdenes pierden el vínculo: las que estén en caché ya no son las buenas.
            qc.invalidateQueries({ queryKey: queryKeys.saleOrders });
            toast.success(t("clientes.eliminado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
