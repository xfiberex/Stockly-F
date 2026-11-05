import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * AUD-008, paso 8 — si una consulta **sin datos** ha fallado, aunque ahora mismo esté
 * reintentando.
 *
 * TanStack Query v5 vuelve a `status: "pending"` al reintentar una consulta que nunca tuvo
 * datos, y borra el `error`. Quien pintaba «error» con `isError` y «cargando» con `isLoading`
 * cambiaba el aviso por un esqueleto al pulsar «Reintentar»: el botón desaparecía con el foco
 * dentro —caía en `<body>`— y, si volvía a fallar, el aviso reaparecía igual, como si no se
 * hubiera hecho nada. `errorUpdateCount` no se reinicia al volver a pedir: mientras no haya
 * datos, lo que falló sigue fallado hasta que llegue algo bueno.
 *
 * `error` es el último que hubo, para que el motivo siga escrito mientras se reintenta. Se
 * guarda al pintar (el patrón de «ajustar el estado al cambiar una entrada» de React), no en un
 * efecto: así no hay un render con el motivo vacío.
 */
export function useFalloDeCarga({ data, error, errorUpdateCount }: { data: unknown; error: unknown; errorUpdateCount: number }) {
    const [ultimo, setUltimo] = useState<unknown>(null);
    if (error && error !== ultimo) setUltimo(error);

    return { fallo: data === undefined && errorUpdateCount > 0, error: error ?? ultimo };
}

/**
 * AUD-008, paso 8 — reintentar **todo lo que falló** en la pantalla, no solo la consulta del
 * botón. En el panel, una caída de la API tumba también las cifras de «Necesita atención», y
 * «Reintentar» solo volvía a pedir `/reports`: las demás se quedaban en «No disponible».
 *
 * Solo las activas (montadas en esta pantalla) y solo las que están en error o nunca tuvieron
 * datos tras fallar: lo que va bien no se vuelve a pedir.
 */
export function useReintentarFallidas() {
    const queryClient = useQueryClient();
    return () =>
        void queryClient.refetchQueries({
            type: "active",
            predicate: (consulta) =>
                consulta.state.status === "error" || (consulta.state.data === undefined && consulta.state.errorUpdateCount > 0),
        });
}
