import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { queryKeys } from "@/shared/constants/queryKeys";
import { createManualMovement } from "@/modules/products/api/product.api";
import { getExpiryReport, type ConsultaDeCaducidades } from "../api/reports.api";
import type { ExpiryRow } from "../types/reports.types";

const CLAVE = [...queryKeys.reports, "expiring"] as const;

/** T5-15 — lo caducado y lo que caduca en el plazo. Cambiar de página o de plazo no vacía la lista. */
export function useExpiryReport(consulta: ConsultaDeCaducidades) {
    return useQuery({
        queryKey: [...CLAVE, consulta],
        queryFn: () => getExpiryReport(consulta),
        placeholderData: keepPreviousData,
    });
}

/**
 * El motivo con el que queda escrita la baja. En el idioma de referencia y no en el de la
 * pantalla, como los demás motivos de un movimiento: es un dato del histórico (T4-04).
 */
export const MOTIVO_DE_BAJA_POR_CADUCIDAD = "Caducado";

/**
 * Dar de baja lo que queda de un lote caducado en un almacén: un **ajuste a cero de ese lote**,
 * por la misma ruta que cualquier movimiento a mano. No hay ruta propia porque no hace falta:
 * es el mismo permiso, la misma auditoría y el mismo histórico.
 */
export function useWriteOffLot() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (fila: ExpiryRow) =>
            createManualMovement(fila.productId, {
                type: "ADJUSTMENT",
                quantity: 0,
                lotId: fila.lotId,
                warehouseId: fila.warehouseId,
                reason: MOTIVO_DE_BAJA_POR_CADUCIDAD,
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.reports });
            qc.invalidateQueries({ queryKey: queryKeys.product });
            qc.invalidateQueries({ queryKey: ["movements"] });
            toast.success(t("caducidades.dadoDeBaja"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
