import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SettingsPage from "@/modules/settings/components/SettingsPage";
import type { SettingEntry } from "@/modules/settings/types/settings.types";

const mockMutate = vi.fn();
let settingsData: SettingEntry[];
let isLoading = false;

vi.mock("@/modules/settings/hooks/useSettings", () => ({
    useSettings: () => ({ data: settingsData, isLoading }),
    useUpdateSettings: () => ({ mutate: mockMutate, isPending: false }),
}));

// `value` es boolean, no cadena: el backend lo parsea según el `type` del catálogo
// antes de responder (`settings.service.ts:parseValue`). Mockearlo como "false"
// ocultaba T1-06 — el interruptor se pintaba apagado con el ajuste activo.
const booleanEntry: SettingEntry = {
    key: "lowStockAlertEnabled",
    label: "Alertas de bajo stock por correo",
    description: "Envía un correo a los administradores cuando el stock cae por debajo del mínimo.",
    type: "boolean",
    value: false,
};

describe("SettingsPage", () => {
    beforeEach(() => {
        mockMutate.mockClear();
        settingsData = [booleanEntry];
        isLoading = false;
    });

    it("renderiza la etiqueta y descripción de cada ajuste", () => {
        renderWithProviders(<SettingsPage />);
        expect(screen.getByText("Alertas de bajo stock por correo")).toBeInTheDocument();
        expect(screen.getByText(/Envía un correo a los administradores/i)).toBeInTheDocument();
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
        settingsData = [{ ...booleanEntry, value: true }];
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
});
