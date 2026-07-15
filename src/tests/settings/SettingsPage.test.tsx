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

const booleanEntry: SettingEntry = {
    key: "lowStockAlertEnabled",
    label: "Alertas de bajo stock por correo",
    description: "Envía un correo a los administradores cuando el stock cae por debajo del mínimo.",
    type: "boolean",
    value: "false",
    defaultValue: "false",
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
        expect(mockMutate).toHaveBeenCalledWith({ lowStockAlertEnabled: "true" });
    });
});
