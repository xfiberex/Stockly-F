import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSincronizarIdioma } from "@/modules/auth/hooks/useSincronizarIdioma";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { CLAVE_DE_IDIOMA } from "@/shared/i18n/idioma";

/**
 * T4-12 — el puente entre la preferencia del navegador y la columna `users.idioma`.
 *
 * Lo que hay que comprobar no es que llame al endpoint, sino **cuándo no lo llama**: un hook
 * que se monta en el layout y escribe en cada render es una petición por cada pantalla que
 * se abre. Los dos casos de escritura y el de silencio están aquí.
 */

vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: vi.fn() }));
vi.mock("@/modules/auth/api/auth.api", () => ({
    AuthAPI: { guardarIdioma: vi.fn().mockResolvedValue({ idioma: "EN" }) },
}));

const usuario = (idioma: "ES" | "EN") => ({
    user: { id: "u1", name: "Ana", email: "ana@stockly.app", role: "USER", idioma, isVerified: true, createdAt: "2026-01-01" },
    isLoading: false,
    isError: false,
});

function envoltorio({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
    vi.mocked(AuthAPI.guardarIdioma).mockClear();
    window.localStorage.clear();
});

describe("Sincronización del idioma de los correos (T4-12)", () => {
    it("no manda nada cuando el guardado ya coincide con el efectivo", async () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "es");
        vi.mocked(useAuth).mockReturnValue(usuario("ES") as unknown as ReturnType<typeof useAuth>);

        renderHook(() => useSincronizarIdioma(), { wrapper: envoltorio });

        // Es el caso normal y el que más veces ocurre: si aquí se escribiera, el hook
        // pondría un `PATCH` en cada montaje del layout.
        await waitFor(() => expect(AuthAPI.guardarIdioma).not.toHaveBeenCalled());
    });

    it("lo guarda cuando la interfaz está en otro idioma que la columna", async () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "en");
        vi.mocked(useAuth).mockReturnValue(usuario("ES") as unknown as ReturnType<typeof useAuth>);

        renderHook(() => useSincronizarIdioma(), { wrapper: envoltorio });

        await waitFor(() => expect(AuthAPI.guardarIdioma).toHaveBeenCalledWith("EN"));
    });

    it("no lo repite mientras la petición está en vuelo", async () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "en");
        vi.mocked(useAuth).mockReturnValue(usuario("ES") as unknown as ReturnType<typeof useAuth>);

        const { rerender } = renderHook(() => useSincronizarIdioma(), { wrapper: envoltorio });

        // `user.idioma` sigue siendo el viejo hasta que la caché se invalida, así que sin la
        // referencia que recuerda lo enviado cada render dispararía otro `PATCH`.
        rerender();
        rerender();

        await waitFor(() => expect(AuthAPI.guardarIdioma).toHaveBeenCalledTimes(1));
    });

    it("sin sesión no toca el servidor", async () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "en");
        vi.mocked(useAuth).mockReturnValue({ user: undefined, isLoading: false, isError: false } as unknown as ReturnType<typeof useAuth>);

        renderHook(() => useSincronizarIdioma(), { wrapper: envoltorio });

        // En la pantalla de login se puede cambiar de idioma, y ahí el `PATCH` respondería 401.
        await waitFor(() => expect(AuthAPI.guardarIdioma).not.toHaveBeenCalled());
    });

    it("un fallo del servidor no rompe nada y se reintenta después", async () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "en");
        vi.mocked(AuthAPI.guardarIdioma).mockRejectedValueOnce(new Error("500"));
        vi.mocked(useAuth).mockReturnValue(usuario("ES") as unknown as ReturnType<typeof useAuth>);

        const { rerender } = renderHook(() => useSincronizarIdioma(), { wrapper: envoltorio });
        await waitFor(() => expect(AuthAPI.guardarIdioma).toHaveBeenCalledTimes(1));

        // Al soltar la marca de «ya enviado», el siguiente render vuelve a intentarlo: los
        // correos seguirían saliendo en el idioma anterior, y eso no puede quedarse fijo.
        rerender();
        await waitFor(() => expect(AuthAPI.guardarIdioma).toHaveBeenCalledTimes(2));
    });
});
