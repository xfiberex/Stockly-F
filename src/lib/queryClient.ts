import { QueryClient } from "@tanstack/react-query";

// Configuración del QueryClient para React Query
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1, // Reintentar una vez en caso de error
            staleTime: 1000 * 60, // 1 minuto antes de considerar los datos como obsoletos
            refetchOnWindowFocus: false, // No refetch al enfocar la ventana
        },
    },
});