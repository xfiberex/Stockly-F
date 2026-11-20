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
import { AnuncioDeRuta } from "@/shared/components/AnuncioDeRuta";
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

    it("«pendiente de aprobación» tiene pantalla propia, sin el formulario, y dice qué viene después (AUD-020)", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(403, "ACCOUNT_PENDING_APPROVAL"));
        renderWithProviders(<><AnuncioDeRuta /><LoginPage /></>, { initialRoute: "/auth/login" });
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stockly.app");
        await user.type(screen.getByLabelText("Contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Entrar" }));

        const titulo = await screen.findByRole("heading", { name: "Tu cuenta espera aprobación", level: 1 });
        // Llega sin que nadie lo pida: el foco va al título, y la pestaña dice lo mismo.
        expect(titulo).toHaveFocus();
        await waitFor(() => expect(document.title).toBe("Tu cuenta espera aprobación · Stockly"));

        // No es un error de nadie: un `status` informativo, no un `alert` rojo.
        const aviso = screen.getByRole("status");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(aviso).toHaveTextContent("Falta un paso: que un administrador apruebe tu cuenta.");
        expect(aviso).toHaveTextContent("Si tarda, pregunta a quien administra Stockly en tu negocio.");
        expect(aviso).toHaveTextContent("Cuenta: ana@stockly.app");
        // Sin el formulario que invitaba a seguir pulsando «Entrar».
        expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
    });

    it("desde la espera se vuelve al formulario con el correo escrito", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(403, "ACCOUNT_PENDING_APPROVAL"));
        const user = await entrar("eva@stockly.app");

        await user.click(await screen.findByRole("button", { name: "Volver al inicio de sesión" }));
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("eva@stockly.app");
        expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Tu cuenta espera aprobación" })).not.toBeInTheDocument();
    });

    it("sin el correo confirmado, ofrece reenviarlo", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(403, "EMAIL_NOT_CONFIRMED"));
        await entrar();

        const aviso = await screen.findByRole("alert");
        const enlace = within(aviso).getByRole("link", { name: "Reenviar el correo de confirmación" });
        expect(enlace).toHaveAttribute("href", "/auth/resend-verification");
        // AUD-014 — va solo en su línea: 44 px en táctil, como los demás enlaces sueltos.
        expect(enlace).toHaveClass("min-h-11");
    });

    it("credenciales que no casan: lo dice claro y ofrece recuperar la contraseña", async () => {
        vi.mocked(AuthAPI.login).mockRejectedValue(errorDeApi(401, "INVALID_CREDENTIALS"));
        await entrar();

        const aviso = await screen.findByRole("alert");
        expect(aviso).toHaveTextContent("El correo o la contraseña no son correctos");
        expect(within(aviso).getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveAttribute("href", "/auth/forgot-password");
        // AUD-014 — medía 20 px de alto en el móvil.
        expect(within(aviso).getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveClass("min-h-11");
        // Uno solo: el de debajo del campo se aparta mientras el aviso lo ofrece.
        expect(screen.getAllByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveLength(1);
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

    it("«Mostrar» la enseña y la vuelve a ocultar, y su nombre dice qué campo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);
        const campo = screen.getByLabelText("Contraseña");
        const mostrar = screen.getByRole("button", { name: "Mostrar «Contraseña»" });

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
        // AUD-014 — la dirección, en su propia línea, para ver una errata de un vistazo.
        const correo = screen.getByText("ana@stockly.app");
        expect(correo).toHaveClass("font-medium");
        await waitFor(() => expect(correo.parentElement).toHaveFocus());
    });

    it("hecho, la pestaña dice «Revisa tu correo» y «Corregir el correo» vuelve al formulario con lo escrito (AUD-014)", async () => {
        vi.mocked(AuthAPI.register).mockResolvedValue(undefined as never);
        const user = userEvent.setup();
        renderWithProviders(<><AnuncioDeRuta /><RegisterPage /></>, { initialRoute: "/auth/register" });

        await user.type(screen.getByLabelText("Nombre"), "Ana");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stokly.app");
        await user.type(screen.getByLabelText("Contraseña"), "secreta123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        await screen.findByRole("heading", { name: "Revisa tu correo", level: 1 });
        await waitFor(() => expect(document.title).toBe("Revisa tu correo · Stockly"));

        await user.click(screen.getByRole("button", { name: "Corregir el correo" }));

        const campo = await screen.findByLabelText("Correo electrónico");
        expect(campo).toHaveValue("ana@stokly.app");
        expect(screen.getByLabelText("Nombre")).toHaveValue("Ana");
        await waitFor(() => expect(campo).toHaveFocus());
        await waitFor(() => expect(document.title).toBe("Crear cuenta · Stockly"));
    });

    it("un fallo del servidor se queda en la tarjeta, con lo escrito delante", async () => {
        vi.mocked(AuthAPI.register).mockRejectedValue(errorDeApi(429, "TOO_MANY_REQUESTS"));
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        await user.type(screen.getByLabelText("Nombre"), "Ana");
        await user.type(screen.getByLabelText("Correo electrónico"), "ana@stockly.app");
        await user.type(screen.getByLabelText("Contraseña", { exact: true }), "secreta123");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "secreta123");
        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");
    });

    it("enviar vacío no dispara una alerta por campo: el foco va al primero, que lee su error", async () => {
        const user = userEvent.setup();
        renderWithProviders(<RegisterPage />);

        await user.click(screen.getByRole("button", { name: "Crear cuenta" }));

        await waitFor(() => expect(screen.getByLabelText("Nombre")).toHaveFocus());
        expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription("El nombre es obligatorio");
        expect(screen.queryAllByRole("alert")).toHaveLength(0);
        // Vacía dice «obligatoria»; corta, «Mínimo 8 caracteres».
        expect(screen.getByText("La contraseña es obligatoria")).toBeInTheDocument();
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
        renderWithProviders(<><AnuncioDeRuta /><ResetPasswordPage /></>, { initialRoute: "/auth/reset-password?token=viejo" });

        const h1 = await screen.findByRole("heading", { name: "Este enlace ya no sirve", level: 1 });
        await waitFor(() => expect(h1).toHaveFocus());
        expect(screen.queryByLabelText("Nueva contraseña")).not.toBeInTheDocument();
        expect(AuthAPI.checkResetToken).toHaveBeenCalledWith("viejo", expect.anything());
        // La pestaña dice lo mismo que el título, no «Nueva contraseña».
        await waitFor(() => expect(document.title).toBe("Este enlace ya no sirve · Stockly"));
    });

    it("una invitación caducada pide un enlace nuevo, y «Olvidé» habla de elegirla, no de recuperarla", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockRejectedValue(errorDeApi(400, "INVALID_OR_EXPIRED_TOKEN"));
        const user = userEvent.setup();
        // Con `AnuncioDeRuta`, que es quien escribe la pestaña.
        renderWithProviders(
            <>
                <AnuncioDeRuta />
                <Routes>
                    <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                </Routes>
            </>,
            { initialRoute: "/auth/reset-password?token=viejo&invitacion=1" },
        );

        expect(await screen.findByText(/La invitación ha caducado/)).toBeInTheDocument();
        expect(screen.queryByText(/restablecer/i)).not.toBeInTheDocument();
        // AUD-014 — «o ya se usó» quiere decir que la cuenta está lista: iniciar sesión es otra
        // salida igual de válida, con forma de botón, y no la vuelta atrás.
        expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/auth/login");
        expect(screen.queryByRole("link", { name: "Volver al inicio de sesión" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("link", { name: "Pedir un enlace nuevo" }));
        expect(await screen.findByRole("heading", { name: "Elegir tu contraseña", level: 1 })).toBeInTheDocument();
        await waitFor(() => expect(document.title).toBe("Elegir tu contraseña · Stockly"));
    });

    it("la invitación con enlace bueno dice para qué cuenta es, y tiene salida", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({ email: "laura@stockly.app" });
        renderWithProviders(<><AnuncioDeRuta /><ResetPasswordPage /></>, { initialRoute: "/auth/reset-password?token=bueno&invitacion=1" });

        expect(await screen.findByText(/^Para laura@stockly.app/)).toBeInTheDocument();
        expect(screen.getByLabelText("Contraseña", { exact: true })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Ya tengo contraseña: iniciar sesión" })).toHaveAttribute("href", "/auth/login");
        await waitFor(() => expect(document.title).toBe("Elige tu contraseña · Stockly"));
    });

    it("la invitación dice quién invita y a qué negocio, si el servidor lo sabe (AUD-020)", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({
            email: "laura@stockly.app",
            invitation: { inviterName: "Ana Admin", businessName: "Ferretería López" },
        });
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=bueno&invitacion=1" });

        expect(await screen.findByText("Ana Admin te ha invitado a Ferretería López.")).toBeInTheDocument();
        // La cuenta, en su propia línea y no dentro de la frase.
        expect(screen.getByText("Entrarás con laura@stockly.app")).toBeInTheDocument();
        // El foco va al título, para que el lector lea quién invita antes del campo.
        expect(screen.getByRole("heading", { name: "Elige tu contraseña", level: 1 })).toHaveFocus();
        // Nunca estuvo en el inicio de sesión: no «vuelve».
        expect(screen.getByRole("link", { name: "Ya tengo contraseña: iniciar sesión" })).toHaveAttribute("href", "/auth/login");
    });

    it("sin nombre de negocio, invita a su equipo, no «a Stockly»", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({
            email: "laura@stockly.app",
            invitation: { inviterName: "Ana Admin", businessName: null },
        });
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=bueno&invitacion=1" });

        expect(await screen.findByText("Ana Admin te ha invitado a su equipo en Stockly.")).toBeInTheDocument();
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
    async function restablecer() {
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
    }

    it("el éxito se dice en la tarjeta del login, con el correo ya puesto", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({ email: "ana@stockly.app" });
        vi.mocked(AuthAPI.resetPassword).mockResolvedValue({ pendingApproval: false });
        await restablecer();

        expect(await screen.findByRole("status")).toHaveTextContent("Contraseña restablecida. Ya puedes entrar con la nueva.");
        expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@stockly.app");
    });

    it("con la cuenta aún sin aprobar, no promete que ya se puede entrar (AUD-014)", async () => {
        vi.mocked(AuthAPI.checkResetToken).mockResolvedValue({ email: "ana@stockly.app" });
        vi.mocked(AuthAPI.resetPassword).mockResolvedValue({ pendingApproval: true });
        await restablecer();

        const aviso = await screen.findByRole("status");
        expect(aviso).toHaveTextContent("Contraseña guardada. Podrás entrar con ella cuando un administrador apruebe tu cuenta");
        expect(aviso).not.toHaveTextContent("Ya puedes entrar");
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
        ["Reenviar la confirmación", <ResendVerificationPage key="r" />, "Reenviar el enlace", AuthAPI.resendVerification],
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

describe("El idioma antes de entrar (AUD-016)", () => {
    it("se elige bajo la tarjeta, cada idioma escrito en el suyo, y cambia la pantalla al momento", async () => {
        const user = userEvent.setup();
        renderWithProviders(<LoginPage />);

        const idiomas = screen.getByRole("group", { name: "Idioma" });
        const ingles = within(idiomas).getByRole("button", { name: "English" });
        expect(ingles).toHaveAttribute("lang", "en");
        expect(within(idiomas).getByRole("button", { name: "Español" })).toHaveAttribute("aria-pressed", "true");

        await user.click(ingles);
        expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
        expect(ingles).toHaveAttribute("aria-pressed", "true");

        // El idioma se guarda en `localStorage`, que jsdom comparte entre tests: se deja como estaba.
        await user.click(screen.getByRole("button", { name: "Español" }));
        expect(screen.getByRole("group", { name: "Idioma" })).toBeInTheDocument();
    });
});
