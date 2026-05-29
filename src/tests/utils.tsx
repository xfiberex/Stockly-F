/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: 0, gcTime: 0 },
            mutations: { retry: false },
        },
    });
}

function AllProviders({ children, initialRoute = "/" }: { children: ReactNode; initialRoute?: string }) {
    return (
        <QueryClientProvider client={createTestQueryClient()}>
            <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
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
