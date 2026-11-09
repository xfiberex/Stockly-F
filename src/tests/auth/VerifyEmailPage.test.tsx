import { screen, waitFor } from "@testing-library/react";
import { AnuncioDeRuta } from "@/shared/components/AnuncioDeRuta";
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
        expect(screen.getByText(/que un administrador apruebe tu cuenta/)).toBeInTheDocument();
    });
});

/**
 * AUD-014 — abrir el enlace otra vez no es un error, y la pantalla dice lo que viene después;
 * sin enlace o con uno caducado, la tarjeta de «Este enlace ya no sirve» con un único paso.
 */
describe("VerifyEmailPage — lo que viene después (AUD-014)", () => {
    const responde = (data: { alreadyVerified: boolean; pendingApproval: boolean }) =>
        vi.mocked(AuthAPI.verifyEmail).mockResolvedValueOnce({ message: "", data });

    it("abierto por segunda vez: «ya estaba confirmada», no un error", async () => {
        responde({ alreadyVerified: true, pendingApproval: true });
        renderWithProviders(<VerifyEmailPage />, { initialRoute: "/auth/confirm-account?token=abc" });

        expect(await screen.findByRole("heading", { name: "Tu cuenta ya estaba confirmada", level: 1 })).toBeInTheDocument();
        expect(screen.getByText(/que un administrador apruebe tu cuenta/)).toBeInTheDocument();
        expect(screen.queryByRole("alert")).toBeNull();
    });

    it("el resultado se anuncia: foco en el título y la pestaña dice lo mismo", async () => {
        responde({ alreadyVerified: true, pendingApproval: true });
        renderWithProviders(<><AnuncioDeRuta /><VerifyEmailPage /></>, { initialRoute: "/auth/confirm-account?token=abc" });

        const h1 = await screen.findByRole("heading", { name: "Tu cuenta ya estaba confirmada", level: 1 });
        await waitFor(() => expect(h1).toHaveFocus());
        await waitFor(() => expect(document.title).toBe("Tu cuenta ya estaba confirmada · Stockly"));
    });

    it("ya aprobada: dice que puede entrar y lleva al login", async () => {
        responde({ alreadyVerified: false, pendingApproval: false });
        renderWithProviders(<VerifyEmailPage />, { initialRoute: "/auth/confirm-account?token=abc" });

        expect(await screen.findByText("Ya puedes iniciar sesión.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/auth/login");
    });

    it("sin enlace: la tarjeta de enlace caducado, con h1 y la salida para pedir otro", () => {
        renderWithProviders(<VerifyEmailPage />, { initialRoute: "/auth/confirm-account" });

        expect(screen.getByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/resend-verification");
    });

    it("enlace caducado: la misma tarjeta, no un mensaje rojo suelto", async () => {
        const { AxiosError } = await import("axios");
        const caducado = new AxiosError("400", "ERR_BAD_REQUEST", undefined, undefined, {
            status: 400, data: { success: false, code: "INVALID_OR_EXPIRED_TOKEN", message: "" },
        } as never);
        vi.mocked(AuthAPI.verifyEmail).mockRejectedValueOnce(caducado);
        renderWithProviders(<VerifyEmailPage />, { initialRoute: "/auth/confirm-account?token=viejo" });

        expect(await screen.findByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
    });
});
