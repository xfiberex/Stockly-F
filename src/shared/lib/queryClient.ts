import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60,
            // No refetch al volver a la pestaña — los usuarios de inventario no esperan datos vivos
            refetchOnWindowFocus: false,
        },
    },
});
