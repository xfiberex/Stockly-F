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
            user: { id: "1", email: "user@test.com", name: "Test", role: "USER", isVerified: true, createdAt: "2024-01-01" },
            isLoading: false,
            isError: false,
        });
        render(<TestApp />);
        expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
        expect(screen.queryByText("Página de login")).toBeNull();
    });
});
