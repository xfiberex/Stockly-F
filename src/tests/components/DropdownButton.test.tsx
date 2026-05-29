import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../utils";
import { DropdownButton } from "@/shared/components/DropdownButton";

const mockItemA = vi.fn();
const mockItemB = vi.fn();

const defaultItems = [
    { label: "Opción A", onClick: mockItemA },
    { label: "Opción B", onClick: mockItemB },
];

describe("DropdownButton", () => {
    it("renderiza el botón con la etiqueta correcta", () => {
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} />);
        expect(screen.getByRole("button", { name: /exportar/i })).toBeInTheDocument();
    });

    it("el menú está cerrado por defecto", () => {
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} />);
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("abre el menú al hacer clic en el botón", async () => {
        const user = userEvent.setup();
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} />);
        await user.click(screen.getByRole("button", { name: /exportar/i }));
        expect(screen.getByRole("menu")).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Opción A" })).toBeInTheDocument();
        expect(screen.getByRole("menuitem", { name: "Opción B" })).toBeInTheDocument();
    });

    it("cierra el menú al hacer clic de nuevo en el botón", async () => {
        const user = userEvent.setup();
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} />);
        const btn = screen.getByRole("button", { name: /exportar/i });
        await user.click(btn);
        await user.click(btn);
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("llama al onClick del ítem y cierra el menú", async () => {
        const user = userEvent.setup();
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} />);
        await user.click(screen.getByRole("button", { name: /exportar/i }));
        await user.click(screen.getByRole("menuitem", { name: "Opción A" }));
        expect(mockItemA).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("cierra el menú al presionar Escape", async () => {
        const user = userEvent.setup();
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} />);
        await user.click(screen.getByRole("button", { name: /exportar/i }));
        expect(screen.getByRole("menu")).toBeInTheDocument();
        await user.keyboard("{Escape}");
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("cierra el menú al hacer clic fuera del componente", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <div>
                <DropdownButton label="Exportar" items={defaultItems} />
                <button>Fuera</button>
            </div>,
        );
        await user.click(screen.getByRole("button", { name: /exportar/i }));
        expect(screen.getByRole("menu")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /fuera/i }));
        expect(screen.queryByRole("menu")).toBeNull();
    });

    it("el botón está deshabilitado cuando disabled=true", () => {
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} disabled />);
        expect(screen.getByRole("button", { name: /exportar/i })).toBeDisabled();
    });

    it("no abre el menú cuando está deshabilitado", async () => {
        renderWithProviders(<DropdownButton label="Exportar" items={defaultItems} disabled />);
        fireEvent.click(screen.getByRole("button", { name: /exportar/i }));
        expect(screen.queryByRole("menu")).toBeNull();
    });
});
