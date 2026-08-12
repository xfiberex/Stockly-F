import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { createTestQueryClient } from "../utils";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from "@/modules/auth/hooks/useMe";

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
            user: { id: "1", email: "user@test.com", name: "Test", role: "USER", idioma: "ES" as const, isVerified: true, createdAt: "2024-01-01" },
            isLoading: false,
            isError: false,
        });
        render(<TestApp />);
        expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
        expect(screen.queryByText("Página de login")).toBeNull();
    });

    // T1-18. Antes solo se comprobaba que existiera sesión, así que un USER que
    // escribía /admin/users en la barra de direcciones llegaba a la página y solo
    // veía cómo fallaban sus peticiones con 403.
    describe("guardia de rol", () => {
        const usuarioConRol = (role: string) => ({
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
