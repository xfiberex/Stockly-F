import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getNegocio, quitarLogo, subirLogo } from "../api/settings.api";
import { SETTINGS_KEY } from "./useSettings";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { fijarSimboloDeMoneda } from "@/shared/lib/moneda";

/**
 * Cuelga de `SETTINGS_KEY` a propósito: guardar la configuración invalida esa clave, y con ella
 * esta, así que cambiar el símbolo de la moneda lo vuelve a pedir sin que nadie se acuerde.
 */
export const NEGOCIO_KEY = [...SETTINGS_KEY, "business"] as const;

/**
 * T6-03 — los datos del negocio y el símbolo de su moneda.
 *
 * **El símbolo se fija dentro de la consulta, no en un efecto de quien la usa.** Un efecto
 * corre después de pintar: las pantallas ya habrían salido una vez con el símbolo anterior.
 * Aquí queda puesto antes de que la consulta entregue el dato, que es lo que espera
 * `ProtectedRoute` para dejar pasar.
 */
export function useNegocio({ enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: NEGOCIO_KEY,
        queryFn: async ({ signal }) => {
            const negocio = await getNegocio(signal);
            fijarSimboloDeMoneda(negocio.currencySymbol);
            return negocio;
        },
        enabled,
    });
}

export function useSubirLogo() {
    const qc = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (archivo: File) => subirLogo(archivo),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: NEGOCIO_KEY });
            toast.success(t("configuracion.logo.guardado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useQuitarLogo() {
    const qc = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: () => quitarLogo(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: NEGOCIO_KEY });
            toast.success(t("configuracion.logo.quitado"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
