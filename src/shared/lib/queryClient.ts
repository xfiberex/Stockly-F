import { MutationCache, QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/constants/queryKeys";

export const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60,
            // No refetch al volver a la pestaña — los usuarios de inventario no esperan datos vivos
            refetchOnWindowFocus: false,
        },
    },
    // AUD-010 — «Necesita atención» resume varias listas en una petición, así que no hay una
    // clave de lista que invalidar al recibir una compra o enviar una venta. Cualquier mutación
    // que salga bien la marca vieja: si el panel está a la vista se vuelve a pedir (una petición
    // pequeña); si no, al volver a él.
    mutationCache: new MutationCache({
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.atencion });
        },
    }),
});
