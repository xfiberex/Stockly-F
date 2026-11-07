import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { Route, Routes } from "react-router-dom";
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
        checkResetToken: vi.fn(),
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

    it("credenciales que no casan: lo dice claro y ofrece recuperar la contraseña", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(401, "INVALID_CREDENTIALS"));
        await entrar();

        const aviso = await screen.findByRole("alert");
        expect(aviso).toHaveTextContent("El correo o la contraseña no son correctos");
        expect(within(aviso).getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/auth/forgot-password");
    });

    it("el correo escrito viaja a «¿Olvidaste…?» y vuelve al login", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            </Routes>,
            { initialRoute: "/auth/login" },
        );

        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stockly.app");
        await user.click(screen.getByRole("link", { name: "¿Olvidaste tu contraseña?" }));
        expect(await screen.findByRole("heading", { name: "Recuperar contraseña" })).toBeInTheDocument();
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");

        await user.click(screen.getByRole("link", { name: "Volver al inicio de sesión" }));
        expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");
        // Con el correo puesto, lo que falta es la contraseña.
        expect(screen.getByLabelText("Contraseña", { exact: true })).toHaveFocus();
    });

    it("la línea de «Reenviar verificación» ya no sale a todos", () => {
        renderWithProviders(<LoginPage />);
        expect(screen.queryByText(/No recibiste el correo de verificación/)).not.toBeInTheDocument();
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
        vi.mocked(AuthAPI.register).mockRejectedValue(errorDeApi(409, "EMAIL_ALREADY_REGISTERED"));
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        await user.type(screen.getByLabelText("Nombre"), "Ana");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stockly.app");
        await user.type(screen.getByLabelText("Contraseña"), "secreta123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        const aviso = await screen.findByRole("alert");
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");
        // Y lo siguiente: entrar o recuperar la cuenta.
        expect(within(aviso).getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/auth/login");
        expect(within(aviso).getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/auth/forgot-password");
    });

    it("el nombre recibe el foco al abrir", () => {
        renderWithProviders(<RegisterPage />);
        expect(screen.getByLabelText("Nombre")).toHaveFocus();
    });

    it("con el error «Mínimo 8 caracteres», el requisito no sale dos veces", async () => {
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        await user.type(screen.getByLabelText("Contraseña"), "corta");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(await screen.findAllByText("Mínimo 8 caracteres")).toHaveLength(1);
        expect(screen.getByLabelText("Contraseña")).toHaveAccessibleDescription("Mínimo 8 caracteres");
    });
});

describe("Restablecer la contraseña (AUD-014)", () => {
    it("sin enlace: «Este enlace ya no sirve», con h1 y «Pedir un enlace nuevo»", () => {
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password" });

        expect(screen.getByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/forgot-password");
        expect(screen.queryByText(/token/i)).toBeNull();
    });

    it("un enlace caducado se dice al abrir, antes de escribir nada, con el foco en el título", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockRejectedValue(errorDeApi(400, "INVALID_OR_EXPIRED_TOKEN"));
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=viejo" });

        const h1 = await screen.findByRole("heading", { name: "Este enlace ya no sirve", level: 1 });
        await waitFor(() => expect(h1).toHaveFocus());
        expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
        expect(AuthAPI.checkResetToken).toHaveBeenCalledWith("viejo", expect.anything());
        // La pestaña dice lo mismo que el título, no «Nueva contraseña».
        await waitFor(() => expect(document.title).not.toMatch(/Nueva contraseña/));
    });

    it("una invitación caducada lleva a restablecer: la cuenta ya existe", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockRejectedValue(errorDeApi(400, "INVALID_OR_EXPIRED_TOKEN"));
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=viejo&invitacion=1" });

        expect(await screen.findByText(/Tu cuenta ya existe/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Restablecer contraseña" })).toHaveAttribute("href", "/auth/forgot-password");
        // Ya no son dos «Volver al inicio de sesión» iguales.
        expect(screen.getAllByRole("link", { name: "Volver al inicio de sesión" })).toHaveLength(1);
    });

    it("con el enlace bueno, el formulario lleva el correo oculto para el gestor de contraseñas", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({ email: "ana@stockly.app" });
        const { container } = renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=bueno" });

        expect(await screen.findByLabelText("Nueva contraseña")).toBeInTheDocument();
        const usuario = container.querySelector('input[autocomplete="username"]');
        expect(usuario).toHaveValue("ana@stockly.app");
        expect(usuario).not.toBeVisible();
    });

    it("si caduca mientras se escribe, la tarjeta cambia a la misma salida al enviar", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({ email: "ana@stockly.app" });
        vi.mocked(AuthAPI.resetPassword).mockRejectedValue(errorDeApi(400, "INVALID_OR_EXPIRED_TOKEN"));
        const user = userEvent.setup();
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=viejo" });

        await user.type(await screen.findByLabelText("Nueva contraseña"), "nueva12345");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "nueva12345");
        await user.click(screen.getByRole("button", { name: "Restablecer contraseña" }));

        expect(await screen.findByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toBeInTheDocument();
    });
});

describe("Restablecer y volver al login (AUD-014)", () => {
    it("el éxito se dice en la tarjeta del login, con el correo ya puesto", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({ email: "ana@stockly.app" });
        vi.mocked(AuthAPI.resetPassword).mockResolvedValue(undefined as never);
        const user = userEvent.setup();
        renderWithProviders(
            <Routes>
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            </Routes>,
            { initialRoute: "/auth/reset-password?token=bueno" },
        );

        await user.type(await screen.findByLabelText("Nueva contraseña"), "nueva12345");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "nueva12345");
        await user.click(screen.getByRole("button", { name: "Restablecer contraseña" }));

        expect(await screen.findByRole("status")).toHaveTextContent("Contraseña restablecida. Ya puedes entrar con la nueva.");
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");
    });
});

describe("Pedir un enlace por correo (AUD-014)", () => {
    it("dice a qué dirección se mandó, la pista del spam, y «Usar otro correo» vuelve al campo", async () => {
        vi.mocked(AuthAPI.forgotPassword).mockResolvedValue(undefined as never);
        const user = userEvent.setup();
        renderWithProviders(<ForgotPasswordPage />);

        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stokly.app");
        await user.click(screen.getByRole("button", { name: "Enviar instrucciones" }));

        expect(await screen.findByRole("status")).toHaveTextContent("ana@stokly.app");
        expect(screen.getByText(/carpeta de spam/)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Usar otro correo" }));
        const campo = await screen.findByLabelText("Correo electrónico");
        expect(campo).toHaveValue("ana@stokly.app");
        await waitFor(() => expect(campo).toHaveFocus());
    });

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
