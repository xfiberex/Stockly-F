import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import ProfilePage from "@/modules/auth/components/ProfilePage";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: vi.fn(),
}));
vi.mock("@/modules/auth/hooks/useUpdateProfile", () => ({
    useUpdateProfile: vi.fn(),
}));
vi.mock("@/modules/auth/hooks/useUpdatePassword", () => ({
    useUpdatePassword: vi.fn(),
}));

import { useAuth } from "@/modules/auth/hooks/useMe";
import { useUpdateProfile } from "@/modules/auth/hooks/useUpdateProfile";
import { useUpdatePassword } from "@/modules/auth/hooks/useUpdatePassword";

const mockProfileMutate = vi.fn();
const mockPasswordMutate = vi.fn();

const mockUser = { id: "u1", name: "Juan García", email: "juan@example.com", role: "USER", idioma: "ES" as const, isVerified: true, createdAt: "2024-01-01T00:00:00Z" };

beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser, isLoading: false, isError: false });
    vi.mocked(useUpdateProfile).mockReturnValue({
        mutate: mockProfileMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useUpdateProfile>);
    vi.mocked(useUpdatePassword).mockReturnValue({
        mutate: mockPasswordMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useUpdatePassword>);
});

describe("ProfilePage", () => {
    it("renderiza los dos formularios", () => {
        renderWithProviders(<ProfilePage />);
        expect(screen.getByRole("heading", { name: /mi perfil/i })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /datos personales/i, level: 2 })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: /cambiar contraseña/i, level: 2 })).toBeInTheDocument();
    });

    it("precarga el formulario con los datos del usuario autenticado", () => {
        renderWithProviders(<ProfilePage />);
        expect(screen.getByDisplayValue("Juan García")).toBeInTheDocument();
        expect(screen.getByDisplayValue("juan@example.com")).toBeInTheDocument();
    });

    it("llama a updateProfile.mutate al guardar datos personales válidos", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProfilePage />);

        const nameInput = screen.getByLabelText(/nombre/i);
        await user.clear(nameInput);
        await user.type(nameInput, "Juan Actualizado");
        await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

        await waitFor(() => {
            expect(mockProfileMutate).toHaveBeenCalledWith({
                name: "Juan Actualizado",
                email: "juan@example.com",
            });
        });
    });

    it("muestra error de validación en perfil si el nombre queda vacío", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProfilePage />);

        const nameInput = screen.getByLabelText(/nombre/i);
        await user.clear(nameInput);
        await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

        await waitFor(() => {
            expect(screen.getByText(/nombre es obligatorio/i)).toBeInTheDocument();
        });
    });

    it("llama a updatePassword.mutate al cambiar contraseña con datos válidos", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProfilePage />);

        await user.type(screen.getByLabelText(/contraseña actual/i), "actual1234");
        const [, newPassInput, confirmInput] = screen.getAllByLabelText(/contraseña/i);
        await user.type(newPassInput, "nueva12345");
        await user.type(confirmInput, "nueva12345");
        await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

        await waitFor(() => {
            expect(mockPasswordMutate).toHaveBeenCalledWith({
                currentPassword: "actual1234",
                password: "nueva12345",
                passwordConfirmation: "nueva12345",
            });
        });
    });

    it("muestra error cuando las nuevas contraseñas no coinciden", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProfilePage />);

        await user.type(screen.getByLabelText(/contraseña actual/i), "actual1234");
        const [, newPassInput, confirmInput] = screen.getAllByLabelText(/contraseña/i);
        await user.type(newPassInput, "nueva12345");
        await user.type(confirmInput, "diferente");
        await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

        await waitFor(() => {
            expect(screen.getByText(/no coinciden/i)).toBeInTheDocument();
        });
    });

    it("muestra error si la contraseña actual está vacía al enviar", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProfilePage />);

        await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

        await waitFor(() => {
            expect(screen.getByText(/contraseña actual es obligatoria/i)).toBeInTheDocument();
        });
    });

    it("no muestra aviso de email si el correo no ha cambiado", () => {
        renderWithProviders(<ProfilePage />);
        expect(screen.queryByText(/verificar el nuevo correo/i)).toBeNull();
    });

    it("muestra aviso cuando el correo es distinto al actual", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProfilePage />);

        const emailInput = screen.getByLabelText(/correo electrónico/i);
        await user.clear(emailInput);
        await user.type(emailInput, "nuevo@example.com");

        expect(screen.getByText(/verificar el nuevo correo/i)).toBeInTheDocument();
    });

    it("deshabilita el botón de perfil cuando isPending=true", () => {
        vi.mocked(useUpdateProfile).mockReturnValue({
            mutate: mockProfileMutate,
            isPending: true,
        } as unknown as ReturnType<typeof useUpdateProfile>);
        renderWithProviders(<ProfilePage />);
        expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeDisabled();
    });

    it("deshabilita el botón de contraseña cuando isPending=true", () => {
        vi.mocked(useUpdatePassword).mockReturnValue({
            mutate: mockPasswordMutate,
            isPending: true,
        } as unknown as ReturnType<typeof useUpdatePassword>);
        renderWithProviders(<ProfilePage />);
        expect(screen.getByRole("button", { name: /cambiar contraseña/i })).toBeDisabled();
    });
});
