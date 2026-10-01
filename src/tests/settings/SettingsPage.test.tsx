import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SettingsPage from "@/modules/settings/components/SettingsPage";
import type { SettingEntry } from "@/modules/settings/types/settings.types";
import { ajusteBooleano } from "@/tests/contratos/fixtures";

const mockMutate = vi.fn();
let settingsData: SettingEntry[];
let isLoading = false;

vi.mock("@/modules/settings/hooks/useSettings", () => ({
    useSettings: () => ({ data: settingsData, isLoading }),
    useUpdateSettings: () => ({ mutate: mockMutate, isPending: false }),
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
            { key: "otro", label: "Otro ajuste", description: "Sin tocar", type: "string", value: "intacto" },
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
            { key: "defaultLeadTimeDays", label: "Plazo de entrega por defecto", description: "", type: "number", value: 7 },
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
            settingsData = [{ ...zona, value: "Etc/GMT+4" }];
            renderWithProviders(<SettingsPage />);

            expect(screen.getByRole("combobox", { name: "Zona horaria del negocio" })).toHaveValue("Etc/GMT+4");
        });
    });
});
