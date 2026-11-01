import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/utils";
import VerifyEmailPage from "@/modules/auth/components/VerifyEmailPage";
import { AuthAPI } from "@/modules/auth/api/auth.api";

vi.mock("@/modules/auth/api/auth.api", () => ({
    AuthAPI: { verifyEmail: vi.fn().mockResolvedValue(undefined) },
}));

describe("VerifyEmailPage", () => {
    // AUD-001 — confirmar el correo ya no da acceso: sin decirlo aquí, la persona iría al login y
    // se encontraría el rechazo sin saber por qué.
    it("al confirmar, avisa de que falta la aprobación de un administrador", async () => {
        renderWithProviders(<VerifyEmailPage />, { initialRoute: "/auth/confirm-account?token=abc" });

        expect(await screen.findByText("¡Cuenta confirmada!")).toBeInTheDocument();
        expect(AuthAPI.verifyEmail).toHaveBeenCalledWith("abc");
        expect(screen.getByText(/un administrador tiene que aprobar tu cuenta/)).toBeInTheDocument();
    });
});
