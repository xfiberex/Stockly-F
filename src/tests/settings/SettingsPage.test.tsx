import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "react-toastify";
import { renderWithProviders } from "@/tests/utils";
import SettingsPage from "@/modules/settings/components/SettingsPage";
import type { SettingEntry } from "@/modules/settings/types/settings.types";
import { ajusteBooleano } from "@/tests/contratos/fixtures";
import type { Rol } from "@/shared/contratos";

const mockMutate = vi.fn();
let settingsData: SettingEntry[];
let isLoading = false;

vi.mock("@/modules/settings/hooks/useSettings", () => ({
    useSettings: () => ({ data: settingsData, isLoading }),
    useUpdateSettings: () => ({ mutate: mockMutate, isPending: false }),
}));

// T6-03 — el logo se sube y se quita por sus propias mutaciones, no con «Guardar cambios».
const mockSubirLogo = vi.fn();
const mockQuitarLogo = vi.fn();
let logoUrl: string | null = null;
let rol: Rol = "ADMIN";

vi.mock("@/modules/settings/hooks/useNegocio", () => ({
    useNegocio: () => ({ data: { name: "", taxId: "", address: "", phone: "", email: "", currencySymbol: "$", logoUrl } }),
    useSubirLogo: () => ({ mutate: mockSubirLogo, isPending: false }),
    useQuitarLogo: () => ({ mutate: mockQuitarLogo, isPending: false }),
}));
vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { role: rol }, isLoading: false, isError: false }),
}));

// T2-24: el mock ya no se declara aquí. Vive en `tests/contratos/fixtures.ts`, que lo
// valida contra un esquema Zod de la respuesta real **al importarlo**, así que este
// test falla si alguien lo desalinea del backend.
//
// Es el caso canónico: `value` es boolean, no cadena, porque el backend lo convierte
// según el `type` del catálogo antes de responder (`settings.service.ts:parseValue`).
// Mockeado como "false" ocultaba T1-06 — el interruptor se pintaba apagado con el
// ajuste activo, y ningún test se enteraba.
const booleanEntry = ajusteBooleano;

describe("SettingsPage", () => {
    beforeEach(() => {
        mockMutate.mockClear();
        settingsData = [booleanEntry];
        isLoading = false;
    });

    it("traduce el rótulo del ajuste en vez de pintar el que manda el servidor", () => {
        // T4-04: la API envía `label` y `description` **en español** —son para quien
        // consulta la API sin interfaz—, así que la pantalla prefiere su propia
        // traducción. Se comprueba con la descripción, que en el catálogo dice «a todos
        // los administradores» y en la respuesta del servidor, solo «a los».
        renderWithProviders(<SettingsPage />);
        expect(screen.getByText("Alertas de bajo stock por correo")).toBeInTheDocument();
        expect(screen.getByText(/a todos los administradores/i)).toBeInTheDocument();
    });

    it("un ajuste que el catálogo no conoce cae al texto del servidor", () => {
        // El respaldo importa: si el backend estrena un ajuste antes de que aquí tenga
        // traducción, lo que se ve es su rótulo en español —no la clave en crudo, que es
        // lo que devolvería `traducir()` sin esta comprobación.
        settingsData = [{ ...booleanEntry, key: "ajusteQueNoExisteTodavia" }];
        renderWithProviders(<SettingsPage />);
        expect(screen.getByText("Alertas de bajo stock por correo")).toBeInTheDocument();
        expect(screen.queryByText(/ajuste\.ajusteQueNoExisteTodavia/)).not.toBeInTheDocument();
    });

    it("muestra el spinner mientras carga", () => {
        isLoading = true;
        settingsData = [];
        const { container } = renderWithProviders(<SettingsPage />);
        expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    });

    it("el botón Guardar está deshabilitado si no hay cambios", () => {
        renderWithProviders(<SettingsPage />);
        expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("habilita Guardar tras cambiar un ajuste y envía los valores actualizados", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SettingsPage />);

        const toggle = screen.getByRole("switch");
        expect(toggle).toHaveAttribute("aria-checked", "false");

        await user.click(toggle);
        expect(toggle).toHaveAttribute("aria-checked", "true");

        const saveBtn = screen.getByRole("button", { name: /guardar/i });
        expect(saveBtn).toBeEnabled();

        await user.click(saveBtn);
        expect(mockMutate.mock.calls[0][0]).toEqual({ lowStockAlertEnabled: true });
    });

    it("pinta el interruptor encendido cuando el ajuste está activo", () => {
        // Se construye entero en vez de con `{ ...booleanEntry, value: true }`: al
        // esparcir un miembro de la unión discriminada del contrato (T4-01) se pierde la
        // correlación entre `type` y `value`, y TypeScript deja de poder comprobarla.
        settingsData = [{ ...booleanEntry, type: "boolean", value: true }];
        renderWithProviders(<SettingsPage />);

        expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("vuelve a deshabilitar Guardar si el ajuste regresa a su valor original", async () => {
        const user = userEvent.setup();
        renderWithProviders(<SettingsPage />);

        const toggle = screen.getByRole("switch");
        const saveBtn = screen.getByRole("button", { name: /guardar/i });

        await user.click(toggle);
        expect(saveBtn).toBeEnabled();

        await user.click(toggle);
        expect(toggle).toHaveAttribute("aria-checked", "false");
        expect(saveBtn).toBeDisabled();
    });

    it("envía solo los ajustes modificados", async () => {
        const user = userEvent.setup();
        settingsData = [
            booleanEntry,
            { key: "otro", label: "Otro ajuste", description: "Sin tocar", group: "general", type: "string", value: "intacto" },
        ];
        renderWithProviders(<SettingsPage />);

        await user.click(screen.getByRole("switch"));
        await user.click(screen.getByRole("button", { name: /guardar/i }));

        expect(mockMutate.mock.calls[0][0]).toEqual({ lowStockAlertEnabled: true });
    });

    it("cada control se llama como su ajuste, y con dos interruptores se sabe cuál es cuál", () => {
        // T5-11 estrenó el segundo interruptor de la lista, y ninguno de los dos tenía nombre:
        // un lector de pantalla anunciaba «interruptor, desactivado» dos veces. El título
        // estaba al lado, sin enlazar.
        settingsData = [
            booleanEntry,
            { ...booleanEntry, key: "weeklyDigestEnabled", label: "Resumen semanal por correo" },
            { key: "defaultLeadTimeDays", label: "Plazo de entrega por defecto", description: "", group: "general", type: "number", value: 7 },
        ];
        renderWithProviders(<SettingsPage />);

        expect(screen.getByRole("switch", { name: "Alertas de bajo stock por correo" })).toBeInTheDocument();
        const resumen = screen.getByRole("switch", { name: "Resumen semanal por correo" });
        expect(resumen).toHaveAccessibleDescription(/resumen de la semana anterior/i);
        expect(screen.getByRole("spinbutton", { name: "Plazo de entrega por defecto" })).toHaveValue(7);
    });

    describe("La zona horaria del negocio (T5-09)", () => {
        const zona: SettingEntry = {
            key: "timezone",
            label: "Zona horaria del negocio",
            description: "",
            group: "general",
            type: "string",
            value: "America/Santo_Domingo",
        };

        it("se elige de una lista, no se escribe a mano, y se guarda la elegida", async () => {
            const user = userEvent.setup();
            settingsData = [zona];
            renderWithProviders(<SettingsPage />);

            const selector = screen.getByRole("combobox", { name: "Zona horaria del negocio" });
            expect(selector).toHaveValue("America/Santo_Domingo");
            expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

            await user.selectOptions(selector, "America/New_York");
            await user.click(screen.getByRole("button", { name: /guardar/i }));

            expect(mockMutate.mock.calls[0][0]).toEqual({ timezone: "America/New_York" });
        });

        it("si la guardada no está en la lista del navegador, sigue saliendo la que está en vigor", () => {
            settingsData = [{ ...zona, type: "string", value: "Etc/GMT+4" }];
            renderWithProviders(<SettingsPage />);

            expect(screen.getByRole("combobox", { name: "Zona horaria del negocio" })).toHaveValue("Etc/GMT+4");
        });
    });

    describe("Datos del negocio y moneda (T6-03)", () => {
        const texto = (key: string, label: string, value: string, maxLength: number): SettingEntry => ({
            key, label, description: "", group: "business", type: "string", value, maxLength,
        });
        const nombre = texto("businessName", "Nombre o razón social", "", 120);
        const correo = texto("businessEmail", "Correo electrónico", "", 254);
        const simbolo = texto("currencySymbol", "Símbolo de la moneda", "$", 5);

        const guardar = () => screen.getByRole("button", { name: /guardar/i });

        beforeEach(() => {
            settingsData = [nombre, correo, simbolo, booleanEntry];
            mockSubirLogo.mockClear();
            mockQuitarLogo.mockClear();
            logoUrl = null;
            rol = "ADMIN";
        });

        it("van en su propia tarjeta, aparte de los ajustes de funcionamiento", () => {
            renderWithProviders(<SettingsPage />);

            const negocio = screen.getByRole("region", { name: "Datos del negocio" });
            expect(within(negocio).getByRole("textbox", { name: "Nombre o razón social" })).toBeInTheDocument();
            expect(within(negocio).getByRole("textbox", { name: "Símbolo de la moneda" })).toHaveValue("$");
            expect(within(negocio).queryByRole("switch")).not.toBeInTheDocument();

            const funcionamiento = screen.getByRole("region", { name: "Funcionamiento" });
            expect(within(funcionamiento).getByRole("switch")).toBeInTheDocument();
            expect(within(funcionamiento).queryByRole("textbox")).not.toBeInTheDocument();
        });

        it("sin datos de negocio en la respuesta, esa tarjeta no sale", () => {
            settingsData = [booleanEntry];
            renderWithProviders(<SettingsPage />);

            expect(screen.queryByRole("region", { name: "Datos del negocio" })).not.toBeInTheDocument();
            expect(screen.getByRole("switch")).toBeInTheDocument();
        });

        it("cambiar el símbolo a RD$ lo guarda con «Guardar cambios», y solo eso", async () => {
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            const campo = screen.getByRole("textbox", { name: "Símbolo de la moneda" });
            await user.clear(campo);
            await user.type(campo, "RD$");
            await user.click(guardar());

            expect(mockMutate.mock.calls[0][0]).toEqual({ currencySymbol: "RD$" });
        });

        it("el campo no deja teclear más caracteres de los que admite el servidor", async () => {
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            const campo = screen.getByRole("textbox", { name: "Símbolo de la moneda" });
            await user.clear(campo);
            await user.type(campo, "RD$MXN");

            expect(campo).toHaveValue("RD$MX");
            expect(screen.getByRole("textbox", { name: "Nombre o razón social" })).toHaveAttribute("maxlength", "120");
        });

        it.each([
            ["₡", /Solo letras sin acento/],
            ["1$", /Solo letras sin acento/],
        ])("un símbolo «%s» se dice en el campo y no se puede guardar", async (escrito, mensaje) => {
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            const campo = screen.getByRole("textbox", { name: "Símbolo de la moneda" });
            await user.clear(campo);
            await user.type(campo, escrito);

            expect(campo).toBeInvalid();
            expect(campo).toHaveAccessibleDescription(mensaje);
            expect(guardar()).toBeDisabled();
        });

        it("un símbolo vacío tampoco: sin moneda no hay importe", async () => {
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            await user.clear(screen.getByRole("textbox", { name: "Símbolo de la moneda" }));

            expect(screen.getByRole("alert")).toHaveTextContent("Escribe entre 1 y 5 caracteres.");
            expect(guardar()).toBeDisabled();
        });

        it("volver a un símbolo válido quita el error y deja guardar", async () => {
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            const campo = screen.getByRole("textbox", { name: "Símbolo de la moneda" });
            await user.clear(campo);
            await user.type(campo, "S/");

            expect(campo).toBeValid();
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
            expect(guardar()).toBeEnabled();
        });

        it("un correo que no lo es bloquea el guardado; uno válido se envía", async () => {
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            const campo = screen.getByRole("textbox", { name: "Correo electrónico" });
            await user.type(campo, "ventas@");
            expect(screen.getByRole("alert")).toHaveTextContent("No es un correo electrónico válido.");
            expect(guardar()).toBeDisabled();

            await user.type(campo, "eltornillo.do");
            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
            await user.click(guardar());

            expect(mockMutate.mock.calls[0][0]).toEqual({ businessEmail: "ventas@eltornillo.do" });
        });

        it("un error en un campo no impide ver los demás, pero sí guardar el lote entero", async () => {
            // El PATCH es un lote: el servidor rechazaría los cuatro por el que está mal.
            const user = userEvent.setup();
            renderWithProviders(<SettingsPage />);

            await user.type(screen.getByRole("textbox", { name: "Nombre o razón social" }), "Ferretería El Tornillo");
            await user.clear(screen.getByRole("textbox", { name: "Símbolo de la moneda" }));

            expect(guardar()).toBeDisabled();
            expect(mockMutate).not.toHaveBeenCalled();
        });

        describe("el logo", () => {
            const imagen = (nombreDeArchivo: string, tipo: string, bytes = 10) =>
                new File([new Uint8Array(bytes)], nombreDeArchivo, { type: tipo });

            it("sin logo ofrece subirlo, y no quitarlo", () => {
                renderWithProviders(<SettingsPage />);

                expect(screen.getByRole("button", { name: "Subir logo" })).toBeInTheDocument();
                expect(screen.queryByRole("button", { name: "Quitar logo" })).not.toBeInTheDocument();
                expect(screen.queryByRole("img", { name: "Logo del negocio" })).not.toBeInTheDocument();
            });

            it("con logo lo enseña, y ofrece cambiarlo o quitarlo", async () => {
                const user = userEvent.setup();
                logoUrl = "https://res.cloudinary.com/demo/logo.png";
                renderWithProviders(<SettingsPage />);

                expect(screen.getByRole("img", { name: "Logo del negocio" })).toHaveAttribute("src", logoUrl);
                expect(screen.getByRole("button", { name: "Cambiar logo" })).toBeInTheDocument();

                await user.click(screen.getByRole("button", { name: "Quitar logo" }));
                expect(mockQuitarLogo).toHaveBeenCalledTimes(1);
            });

            it("elegir una imagen la sube en el acto, sin pasar por «Guardar cambios»", async () => {
                const user = userEvent.setup();
                renderWithProviders(<SettingsPage />);
                const png = imagen("logo.png", "image/png");

                await user.upload(screen.getByLabelText("Archivo del logo"), png);

                expect(mockSubirLogo).toHaveBeenCalledWith(png);
                expect(mockMutate).not.toHaveBeenCalled();
            });

            it.each([
                ["un PDF", imagen("logo.pdf", "application/pdf"), "El archivo tiene que ser una imagen JPG, PNG o WebP."],
                ["una imagen de más de 2 MB", imagen("logo.png", "image/png", 2 * 1024 * 1024 + 1), "La imagen no puede pesar más de 2 MB."],
            ])("%s se rechaza aquí, con su motivo, y no llega a enviarse", async (_caso, archivo, mensaje) => {
                // `applyAccept: false`: se prueba la comprobación del componente, no el filtro
                // del diálogo de archivos, que un arrastre o un navegador laxo se saltan.
                const user = userEvent.setup({ applyAccept: false });
                const error = vi.spyOn(toast, "error").mockImplementation(() => "");
                renderWithProviders(<SettingsPage />);

                await user.upload(screen.getByLabelText("Archivo del logo"), archivo);

                expect(error).toHaveBeenCalledWith(mensaje);
                expect(mockSubirLogo).not.toHaveBeenCalled();
                error.mockRestore();
            });

            it("los botones del logo salen de la matriz de permisos, no de estar en esta página", () => {
                rol = "USER";
                logoUrl = "https://res.cloudinary.com/demo/logo.png";
                renderWithProviders(<SettingsPage />);

                expect(screen.getByRole("img", { name: "Logo del negocio" })).toBeInTheDocument();
                expect(screen.queryByRole("button", { name: /logo/i })).not.toBeInTheDocument();
            });
        });
    });
});
