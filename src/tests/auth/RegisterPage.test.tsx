import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import RegisterPage from "@/modules/auth/components/RegisterPage";

vi.mock("@/modules/auth/hooks/useRegister", () => ({
    useRegister: vi.fn(),
}));

import { useRegister } from "@/modules/auth/hooks/useRegister";

const mockMutate = vi.fn();

beforeEach(() => {
    vi.mocked(useRegister).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useRegister>);
});

describe("RegisterPage", () => {
    it("renderiza el formulario de registro", () => {
        renderWithProviders(<RegisterPage />);
        expect(screen.getByRole("heading", { name: /crear cuenta/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
        expect(screen.getAllByLabelText(/contraseña/i)).toHaveLength(2);
        expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeInTheDocument();
    });

    it("muestra enlace para ir al login", () => {
        renderWithProviders(<RegisterPage />);
        expect(screen.getByRole("link", { name: /inicia sesión/i })).toHaveAttribute("href", "/auth/login");
    });

    it("muestra errores de validación al enviar vacío", async () => {
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);
        await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
        await waitFor(() => {
            expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
        });
    });

    it("muestra error cuando las contraseñas no coinciden", async () => {
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);
        await user.type(screen.getByLabelText(/nombre/i), "Juan");
        await user.type(screen.getByLabelText(/correo/i), "juan@example.com");
        const [passwordInput, confirmInput] = screen.getAllByLabelText(/contraseña/i);
        await user.type(passwordInput, "12345678");
        await user.type(confirmInput, "diferente");
        await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
        await waitFor(() => {
            expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
        });
    });

    it("llama a mutate con los datos correctos en submit válido", async () => {
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);
        await user.type(screen.getByLabelText(/nombre/i), "Juan García");
        await user.type(screen.getByLabelText(/correo/i), "juan@example.com");
        const [passwordInput, confirmInput] = screen.getAllByLabelText(/contraseña/i);
        await user.type(passwordInput, "12345678");
        await user.type(confirmInput, "12345678");
        await user.click(screen.getByRole("button", { name: /crear cuenta/i }));
        await waitFor(() => {
            expect(mockMutate).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "Juan García",
                    email: "juan@example.com",
                    password: "12345678",
                }),
            );
        });
    });

    it("deshabilita el botón cuando isPending=true", () => {
        vi.mocked(useRegister).mockReturnValue({
            mutate: mockMutate,
            isPending: true,
        } as unknown as ReturnType<typeof useRegister>);
        renderWithProviders(<RegisterPage />);
        expect(screen.getByRole("button", { name: /crear cuenta/i })).toBeDisabled();
    });
});
