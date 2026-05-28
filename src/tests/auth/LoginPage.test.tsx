import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import LoginPage from "@/modules/auth/components/LoginPage";

vi.mock("@/modules/auth/hooks/useLogin", () => ({
    useLogin: vi.fn(),
}));

import { useLogin } from "@/modules/auth/hooks/useLogin";

const mockMutate = vi.fn();

beforeEach(() => {
    vi.mocked(useLogin).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useLogin>);
});

describe("LoginPage", () => {
    it("renderiza el formulario de login completo", () => {
        renderWithProviders(<LoginPage />);
        expect(screen.getByRole("heading", { name: /iniciar sesión/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
    });

    it("muestra enlace a registro y a contraseña olvidada", () => {
        renderWithProviders(<LoginPage />);
        expect(screen.getByRole("link", { name: /regístrate/i })).toHaveAttribute("href", "/auth/register");
        expect(screen.getByRole("link", { name: /olvidaste/i })).toHaveAttribute("href", "/auth/forgot-password");
    });

    it("muestra errores de validación al enviar con campos vacíos", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);
        await user.click(screen.getByRole("button", { name: /entrar/i }));
        await waitFor(() => {
            expect(screen.getByText(/email es obligatorio/i)).toBeInTheDocument();
        });
    });

    it("muestra error de email inválido usando fireEvent.submit para evitar validación nativa de JSDOM", async () => {
        renderWithProviders(<LoginPage />);
        const emailInput = screen.getByLabelText(/correo/i);
        // userEvent.type dispara change events; fireEvent.submit evita que JSDOM intercepte con validación nativa
        fireEvent.change(emailInput, { target: { value: "no-es-email" } });
        const form = screen.getByRole("button", { name: /entrar/i }).closest("form")!;
        fireEvent.submit(form);
        await waitFor(() => {
            expect(screen.getByText("Email no válido")).toBeInTheDocument();
        });
    });

    it("llama a mutate con email y contraseña correctos", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);
        await user.type(screen.getByLabelText(/correo/i), "usuario@ejemplo.com");
        await user.type(screen.getByLabelText(/contraseña/i), "miContraseña");
        await user.click(screen.getByRole("button", { name: /entrar/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith({
                email: "usuario@ejemplo.com",
                password: "miContraseña",
            });
        });
    });

    it("deshabilita el botón y muestra spinner cuando isPending=true", () => {
        vi.mocked(useLogin).mockReturnValue({
            mutate: mockMutate,
            isPending: true,
        } as unknown as ReturnType<typeof useLogin>);
        renderWithProviders(<LoginPage />);
        expect(screen.getByRole("button", { name: /entrar/i })).toBeDisabled();
    });
});
