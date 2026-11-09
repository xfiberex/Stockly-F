import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import ResetPasswordPage from "@/modules/auth/components/ResetPasswordPage";

// T6-10 — la invitación reutiliza esta página. Lo que se envía es lo mismo; lo que se lee, no:
// quien abre una invitación no ha olvidado ninguna contraseña.

const mutate = vi.fn();
const llamadas: Array<[string, boolean | undefined]> = [];

vi.mock("@/modules/auth/hooks/useResetPassword", () => ({
    // AUD-014 — el enlace se comprueba al abrir; aquí, siempre bueno.
    useEnlaceDeRestablecer: () => ({ isPending: false, data: { email: "ana@stockly.app" }, error: null }),
    useResetPassword: (token: string, invitacion?: boolean) => {
        llamadas.push([token, invitacion]);
        return { mutate, isPending: false, error: null };
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
    llamadas.length = 0;
});

describe("ResetPasswordPage", () => {
    it("desde «olvidé mi contraseña» habla de restablecer", () => {
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=abc" });

        expect(screen.getByRole("heading", { name: "Nueva contraseña" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Restablecer contraseña" })).toBeInTheDocument();
        expect(llamadas.at(-1)).toEqual(["abc", false]);
    });

    it("desde una invitación habla de elegirla, y envía lo mismo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?token=abc&invitacion=1" });

        expect(screen.getByRole("heading", { name: "Elige tu contraseña" })).toBeInTheDocument();
        // AUD-014 — dice para qué cuenta es.
        expect(screen.getByText(/^Para ana@stockly.app/)).toBeInTheDocument();
        expect(screen.queryByText(/restablecer/i)).not.toBeInTheDocument();
        expect(llamadas.at(-1)).toEqual(["abc", true]);

        // AUD-014 — quien llega por una invitación no tenía ninguna: «Contraseña», no «Nueva».
        await user.type(screen.getByLabelText("Contraseña", { exact: true }), "Almacen2026");
        await user.type(screen.getByLabelText("Confirmar contraseña"), "Almacen2026");
        await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

        await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
        expect(mutate.mock.calls[0]![0]).toMatchObject({ password: "Almacen2026" });
    });

    it("sin token no hay formulario, venga de donde venga", () => {
        renderWithProviders(<ResetPasswordPage />, { initialRoute: "/auth/reset-password?invitacion=1" });

        // AUD-014 — la tarjeta de enlace caducado. La invitación pide un enlace nuevo: la cuenta
        // ya existe y no depende de un administrador.
        expect(screen.getByRole("heading", { name: "Este enlace ya no sirve", level: 1 })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/forgot-password");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});
