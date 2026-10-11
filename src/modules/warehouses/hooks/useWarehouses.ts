import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { queryKeys } from "@/shared/constants/queryKeys";
import { createWarehouse, getWarehouses, getWarehousesSummary, setDefaultWarehouse, setWarehouseActive, updateWarehouse } from "../api/warehouses.api";
import type { Clave } from "@/shared/i18n/traducir";
import type { WarehouseForm } from "../types/warehouses.types";

/**
 * T5-14 — los almacenes del negocio, que son pocos y llegan todos de una vez.
 *
 * `hayVarios` es la pregunta que se hace toda la interfaz: **con un solo almacén activo, la
 * aplicación se ve como antes de que hubiera almacenes** —ni selectores, ni columnas, ni
 * desgloses—, porque no hay nada que elegir ni nada que desglosar. Lo que no dice almacén va
 * al predeterminado, en la interfaz igual que en la API.
 *
 * La lista se da por buena cinco minutos: la piden casi todas las pantallas y solo cambia
 * cuando alguien da de alta o desactiva un almacén, que ya la invalida.
 */
export function useAlmacenes() {
    const consulta = useQuery({ queryKey: queryKeys.warehouses, queryFn: getWarehouses, staleTime: 5 * 60_000 });
    const almacenes = consulta.data ?? [];
    const activos = almacenes.filter((a) => a.isActive);
    const porId = new Map(almacenes.map((a) => [a.id, a]));

    return {
        almacenes,
        activos,
        predeterminado: almacenes.find((a) => a.isDefault),
        hayVarios: activos.length > 1,
        /** El nombre de un almacén, o una raya mientras la lista no ha llegado. */
        nombreDe: (id: string) => porId.get(id)?.name ?? "—",
        isLoading: consulta.isLoading,
    };
}

/** Los almacenes con lo que guarda cada uno: la pantalla que los gestiona, y nadie más. */
export function useAlmacenesConCifras() {
    return useQuery({ queryKey: queryKeys.warehousesSummary, queryFn: getWarehousesSummary });
}

/**
 * El almacén de un formulario: el que se elija y, mientras nadie elige, el predeterminado.
 * `paraEnviar` es lo que va en la petición: con un solo almacén no se manda nada y decide el
 * servidor, que es lo que hacía antes.
 */
export function useAlmacenDeOperacion(inicial?: string) {
    const { predeterminado, hayVarios, activos } = useAlmacenes();
    const [elegido, setElegido] = useState(inicial ?? "");
    // Si el elegido se desactivó desde otra pantalla, se vuelve al predeterminado.
    const vigente = elegido && activos.some((a) => a.id === elegido) ? elegido : (predeterminado?.id ?? "");

    return {
        warehouseId: vigente,
        setWarehouseId: setElegido,
        paraEnviar: hayVarios && vigente ? vigente : undefined,
        hayVarios,
    };
}

/** Lo que hacen las cuatro mutaciones al terminar: refrescar la lista y decirlo. */
function useAlTerminar(aviso: Clave) {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return {
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.warehouses });
            qc.invalidateQueries({ queryKey: queryKeys.warehousesSummary });
            toast.success(t(aviso));
        },
        onError: (error: unknown) => {
            toast.error(mensajeDeError(idioma, error));
        },
    };
}

export function useCreateWarehouse() {
    return useMutation({ mutationFn: (form: WarehouseForm) => createWarehouse(form), ...useAlTerminar("almacenes.creado") });
}

export function useUpdateWarehouse() {
    return useMutation({
        mutationFn: ({ id, form }: { id: string; form: WarehouseForm }) => updateWarehouse(id, form),
        ...useAlTerminar("almacenes.actualizado"),
    });
}

export function useSetDefaultWarehouse() {
    return useMutation({ mutationFn: (id: string) => setDefaultWarehouse(id), ...useAlTerminar("almacenes.predeterminadoCambiado") });
}

export function useSetWarehouseActive() {
    return useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) => setWarehouseActive(id, active),
        ...useAlTerminar("almacenes.estadoCambiado"),
    });
}
