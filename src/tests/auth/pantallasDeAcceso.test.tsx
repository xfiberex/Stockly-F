import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/tests/utils";
import LoginPage from "@/modules/auth/components/LoginPage";
import RegisterPage from "@/modules/auth/components/RegisterPage";
import ResetPasswordPage from "@/modules/auth/components/ResetPasswordPage";
import ResendVerificationPage from "@/modules/auth/components/ResendVerificationPage";
import ForgotPasswordPage from "@/modules/auth/components/ForgotPasswordPage";
import { AuthAPI } from "@/modules/auth/api/auth.api";

/**
 * AUD-014 — las pantallas de acceso, con los hooks de verdad y la API simulada. Lo que se vigila:
 * que el motivo del servidor se quede en la tarjeta (antes, un aviso de 3 s en una esquina); que
 * el registro diga los dos pasos y acabe en «Revisa tu correo»; que un enlace caducado tenga
 * salida; y que tras pedir un enlace el foco no se pierda.
 */

vi.mock("@/modules/auth/api/auth.api", () => ({
    AuthAPI: {
        login: vi.fn(),
        register: vi.fn(),
        resetPassword: vi.fn(),
        resendVerification: vi.fn(),
        forgotPassword: vi.fn(),
    },
}));

/** Un error de la API con su `code`, como lo devuelve axios. */
const errorDeApi = (status: number, code: string) =>
    new AxiosError(String(status), "ERR_BAD_REQUEST", undefined, undefined, {
        status,
        data: { success: false, code, message: "" },
    } as never);

beforeEach(() => vi.clearAllMocks());

describe("Iniciar sesión (AUD-014)", () => {
    async function entrar(correo = "ana@stockly.app") {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);
        await user.type(screen.getByLabelText("Correo electrónico"), correo);
        await user.type(screen.getByLabelText("Contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Entrar" }));
        return user;
    }

    it("«pendiente de aprobación» se queda en la tarjeta, y dice qué viene después", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(403, "ACCOUNT_PENDING_APPROVAL"));
        await entrar();

        const aviso = await screen.findByRole("alert");
        expect(aviso).toHaveTextContent(/pendiente/i);
        expect(aviso).toHaveTextContent("Te avisaremos por correo.");
    });

    it("sin el correo confirmado, ofrece reenviarlo", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(403, "EMAIL_NOT_CONFIRMED"));
        await entrar();

        const aviso = await screen.findByRole("alert");
        expect(within(aviso).getByRole("link", { name: "Reenviar el correo de confirmación" })).toHaveAttribute("href", "/auth/resend-verification");
    });

    it("el correo recibe el foco al abrir, y no hay burbuja nativa: el formulario es `noValidate`", () => {
        renderWithProviders(<LoginPage />);

        expect(screen.getByLabelText("Correo electrónico")).toHaveFocus();
        expect(screen.getByLabelText("Correo electrónico").closest("form")).toHaveAttribute("novalidate");
        expect(screen.getByLabelText("Contraseña")).not.toHaveAttribute("placeholder", "••••••••");
    });

    it("«Mostrar la contraseña» la enseña y la vuelve a ocultar", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);
        const campo = screen.getByLabelText("Contraseña");
        const mostrar = screen.getByRole("button", { name: "Mostrar la contraseña" });

        expect(campo).toHaveAttribute("type", "password");
        await user.click(mostrar);
        expect(campo).toHaveAttribute("type", "text");
        expect(mostrar).toHaveAttribute("aria-pressed", "true");
        await user.click(mostrar);
        expect(campo).toHaveAttribute("type", "password");
    });
});

describe("Registro (AUD-014)", () => {
    it("anticipa los dos pasos y, hecho, se queda en «Revisa tu correo» con el foco en el mensaje", async () => {
        vi.mocked(AuthAPI.register).mockResolvedValue(undefined as never);
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        expect(screen.getByText("Para entrar faltan dos pasos:")).toBeInTheDocument();
        expect(screen.getByText(/Que un administrador apruebe la cuenta/)).toBeInTheDocument();
        // El requisito, fijo bajo el campo y atado a él.
        expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Mínimo 8 caracteres");

        await user.type(screen.getByLabelText("Nombre"), "Ana");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stockly.app");
        await user.type(screen.getByLabelText("Contraseña"), "secreta123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(await screen.findByRole("heading", { name: "Revisa tu correo", level: 1 })).toBeInTheDocument();
        const mensaje = screen.getByText("Te hemos enviado un enlace a ana@stockly.app para confirmar la cuenta.");
        await waitFor(() => expect(mensaje).toHaveFocus());
    });

    it("un correo ya registrado se dice en la tarjeta, con lo escrito delante", async () => {
        vi.mocked(AuthAPI.register).mockRejectedValue(errorDeApi(409, "EMAIL_IN_USE"));
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        await user.type(screen.getByLabelText("Nombre"), "Ana");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stockly.app");
        await user.type(screen.getByLabelText("Contraseña"), "secreta123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");
    });
});

describe("Restablecer la contraseña (AUD-014)", () => {
    it("sin enlace: «Este enlace ya no sirve», con h1 y «Pedir un enlace nuevo»", () => {
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password" });

        expect(screen.getByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/forgot-password");
        expect(screen.queryByText(/token/i)).toBeNull();
    });

    it("si el servidor dice que caducó, la tarjeta cambia a la misma salida", async () => {
        vi.mocked(AuthAPI.resetPassword).mockRejectedValue(errorDeApi(400, "INVALID_OR_EXPIRED_TOKEN"));
        const user = userEvent.setup();
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=viejo" });

        await user.type(screen.getByLabelText("Nueva contraseña"), "nueva12345");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "nueva12345");
        await user.click(screen.getByRole("button", { name: "Restablecer contraseña" }));

        expect(await screen.findByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toBeInTheDocument();
    });
});

describe("Pedir un enlace por correo (AUD-014)", () => {
    it.each([
        ["Reenviar verificación", <ResendVerificationPage key="r" />, "Reenviar correo", AuthAPI.resendVerification],
        ["Olvidé la contraseña", <ForgotPasswordPage key="f" />, "Enviar instrucciones", AuthAPI.forgotPassword],
    ])("%s: hecho, el foco va a la confirmación, que no revela si la cuenta existe", async (_nombre, pantalla, boton, api) => {
        vi.mocked(api).mockResolvedValue(undefined as never);
        const user = userEvent.setup();
        renderWithProviders(pantalla);

        await user.type(screen.getByLabelText("Correo electrónico"), "quien@sea.com");
        await user.click(screen.getByRole("button", { name: boton }));

        const confirmacion = await screen.findByRole("status");
        expect(confirmacion).toHaveTextContent(/^Si /);
        await waitFor(() => expect(within(confirmacion).getByText(/^Si /)).toHaveFocus());
    });
});
