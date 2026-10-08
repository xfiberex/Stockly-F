import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { createTestQueryClient } from "../utils";
import type { Rol } from "@/shared/contratos";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: vi.fn(),
}));

// T6-03 — el guardia espera también a la moneda del negocio. Aquí se decide a mano en qué
// estado está esa consulta; el recorrido entero, con la consulta de verdad, está en
// `settings/monedaDelNegocio.test.tsx`.
vi.mock("@/modules/settings/hooks/useNegocio", () => ({
    useNegocio: vi.fn(() => ({ isLoading: false })),
}));

import { useAuth } from "@/modules/auth/hooks/useMe";
import { useNegocio } from "@/modules/settings/hooks/useNegocio";

const usuario = { id: "1", email: "user@test.com", name: "Test", role: "USER" as const, idioma: "ES" as const, isVerified: true, createdAt: "2024-01-01" };
const negocioEn = (estado: { isLoading: boolean }) => vi.mocked(useNegocio).mockReturnValue(estado as ReturnType<typeof useNegocio>);

function TestApp() {
    return (
        <QueryClientProvider client={createTestQueryClient()}>
            <MemoryRouter initialEntries={["/"]}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <div>Contenido protegido</div>
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/auth/login" element={<div>Página de login</div>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
}

describe("ProtectedRoute", () => {
    it("muestra spinner mientras carga", () => {
        vi.mocked(useAuth).mockReturnValue({ user: undefined, isLoading: true, isError: false });
        render(<TestApp />);
        // Spinner renderiza un elemento giratorio — verificamos que no muestra contenido protegido
        expect(screen.queryByText("Contenido protegido")).toBeNull();
        expect(screen.queryByText("Página de login")).toBeNull();
    });

    it("redirige a /auth/login cuando hay error de autenticación", () => {
        vi.mocked(useAuth).mockReturnValue({ user: undefined, isLoading: false, isError: true });
        render(<TestApp />);
        expect(screen.getByText("Página de login")).toBeInTheDocument();
        expect(screen.queryByText("Contenido protegido")).toBeNull();
    });

    it("redirige a /auth/login cuando no hay usuario", () => {
        vi.mocked(useAuth).mockReturnValue({ user: undefined, isLoading: false, isError: false });
        render(<TestApp />);
        expect(screen.getByText("Página de login")).toBeInTheDocument();
    });

    it("renderiza los children cuando el usuario está autenticado", () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { id: "1", email: "user@test.com", name: "Test", role: "USER" as const, idioma: "ES" as const, isVerified: true, createdAt: "2024-01-01" },
            isLoading: false,
            isError: false,
        });
        render(<TestApp />);
        expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
        expect(screen.queryByText("Página de login")).toBeNull();
    });

    describe("por permiso, para las pantallas que abren varios roles (T6-08)", () => {
        function Mostrador() {
            return (
                <QueryClientProvider client={createTestQueryClient()}>
                    <MemoryRouter initialEntries={["/counter"]}>
                        <Routes>
                            <Route path="/" element={<div>Panel</div>} />
                            <Route
                                path="/counter"
                                element={
                                    <ProtectedRoute requirePermiso="POST /sale-orders/counter">
                                        <div>Mostrador</div>
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            );
        }
        const entrar = (role: Rol) => {
            vi.mocked(useAuth).mockReturnValue({ user: { ...usuario, role }, isLoading: false, isError: false });
            return render(<Mostrador />);
        };

        it.each(["ADMIN", "SELLER"] as const)("un %s entra", (role) => {
            entrar(role);

            expect(screen.getByText("Mostrador")).toBeInTheDocument();
        });

        it.each(["USER", "WAREHOUSE"] as const)("un %s vuelve al panel: tiene sesión, lo que no tiene es el permiso", (role) => {
            entrar(role);

            expect(screen.queryByText("Mostrador")).toBeNull();
            expect(screen.getByText("Panel")).toBeInTheDocument();
        });
    });

    describe("la moneda del negocio (T6-03)", () => {
        afterEach(() => {
            negocioEn({ isLoading: false });
        });

        it("con sesión y la moneda todavía en camino, sigue el spinner: ninguna pantalla se pinta antes", () => {
            vi.mocked(useAuth).mockReturnValue({ user: usuario, isLoading: false, isError: false });
            negocioEn({ isLoading: true });

            render(<TestApp />);

            expect(screen.queryByText("Contenido protegido")).toBeNull();
            expect(screen.queryByText("Página de login")).toBeNull();
        });

        it("no la pide sin sesión: respondería 401 y no hay a quién pintarle un importe", () => {
            vi.mocked(useAuth).mockReturnValue({ user: undefined, isLoading: true, isError: false });
            render(<TestApp />);
            expect(vi.mocked(useNegocio)).toHaveBeenLastCalledWith({ enabled: false });

            vi.mocked(useAuth).mockReturnValue({ user: usuario, isLoading: false, isError: false });
            render(<TestApp />);
            expect(vi.mocked(useNegocio)).toHaveBeenLastCalledWith({ enabled: true });
        });
    });

    // T1-18. Antes solo se comprobaba que existiera sesión, así que un USER que
    // escribía /admin/users en la barra de direcciones llegaba a la página y solo
    // veía cómo fallaban sus peticiones con 403.
    describe("guardia de rol", () => {
        const usuarioConRol = (role: Rol) => ({
            user: { id: "1", email: "user@test.com", name: "Test", role, idioma: "ES" as const, isVerified: true, createdAt: "2024-01-01" },
            isLoading: false,
            isError: false,
        });

        function AppConRuta() {
            return (
                <QueryClientProvider client={createTestQueryClient()}>
                    <MemoryRouter initialEntries={["/admin/users"]}>
                        <Routes>
                            <Route path="/" element={<div>Dashboard</div>} />
                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute requireRole="ADMIN">
                                        <div>Gestión de usuarios</div>
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            );
        }

        it("un USER es redirigido al dashboard, no al login", () => {
            vi.mocked(useAuth).mockReturnValue(usuarioConRol("USER"));
            render(<AppConRuta />);

            expect(screen.getByText("Dashboard")).toBeInTheDocument();
            expect(screen.queryByText("Gestión de usuarios")).toBeNull();
        });

        it("un ADMIN accede con normalidad", () => {
            vi.mocked(useAuth).mockReturnValue(usuarioConRol("ADMIN"));
            render(<AppConRuta />);

            expect(screen.getByText("Gestión de usuarios")).toBeInTheDocument();
        });

        it("sin `requireRole` sigue bastando con tener sesión", () => {
            vi.mocked(useAuth).mockReturnValue(usuarioConRol("USER"));
            render(<TestApp />);

            expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
        });
    });
});
