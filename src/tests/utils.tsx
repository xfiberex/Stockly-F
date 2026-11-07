/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { createContext, useContext, useState, type ReactElement, type ReactNode } from "react";

export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: 0, gcTime: 0 },
            mutations: { retry: false },
        },
    });
}

/**
 * AUD-011 — lo que se pinta dentro del router. Va por contexto y no en la definición de la ruta
 * porque el router se crea una vez y `rerender` cambia los hijos: así la ruta siempre pinta los
 * de ahora.
 */
const Hijos = createContext<ReactNode>(null);

function PintarHijos() {
    return <>{useContext(Hijos)}</>;
}

/**
 * Un router **de datos**, como el de producción (`createBrowserRouter`). Con `MemoryRouter`,
 * `useBlocker` —el aviso de cambios sin guardar— lanza, y los tests no montarían las pantallas
 * que lo usan. La ruta `*` deja que un test monte sus propias `<Routes>` dentro.
 */
function AllProviders({ children, initialRoute = "/" }: { children: ReactNode; initialRoute?: string }) {
    const [queryClient] = useState(createTestQueryClient);
    const [router] = useState(() => createMemoryRouter([{ path: "*", element: <PintarHijos /> }], { initialEntries: [initialRoute] }));
    return (
        <QueryClientProvider client={queryClient}>
            <Hijos.Provider value={children}>
                <RouterProvider router={router} />
            </Hijos.Provider>
        </QueryClientProvider>
    );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
    initialRoute?: string;
}

export function renderWithProviders(
    ui: ReactElement,
    { initialRoute = "/", ...options }: CustomRenderOptions = {},
) {
    return render(ui, {
        wrapper: ({ children }) => (
            <AllProviders initialRoute={initialRoute}>{children}</AllProviders>
        ),
        ...options,
    });
}
