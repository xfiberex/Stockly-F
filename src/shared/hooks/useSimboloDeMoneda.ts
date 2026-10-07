import { useSyncExternalStore } from "react";
import { simboloDeMoneda, suscribirseALaMoneda } from "@/shared/lib/moneda";

/**
 * T6-03 — el símbolo de la moneda del negocio, para quien necesita **enterarse de que cambia**.
 *
 * Pintar un importe no lo necesita: `formatearImporte` lee el símbolo en vigor. Esto es para
 * `ProtectedRoute`, que vuelve a montar las pantallas cuando un administrador lo cambia.
 */
export function useSimboloDeMoneda(): string {
    return useSyncExternalStore(suscribirseALaMoneda, simboloDeMoneda);
}
