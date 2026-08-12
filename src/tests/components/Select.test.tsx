import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "@/shared/components/Select";

const options = [
    { value: "opt1", label: "Opción 1" },
    { value: "opt2", label: "Opción 2" },
    { value: "opt3", label: "Opción 3" },
];

describe("Select", () => {
    it("renderiza el elemento select", () => {
        render(<Select options={options} />);
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("renderiza todas las opciones", () => {
        render(<Select options={options} />);
        expect(screen.getAllByRole("option")).toHaveLength(options.length);
    });

    it("renderiza placeholder como primera opción vacía", () => {
        render(<Select options={options} placeholder="Elige uno..." />);
        const opts = screen.getAllByRole("option");
        expect(opts[0]).toHaveTextContent("Elige uno...");
        expect(opts[0]).toHaveValue("");
    });

    it("renderiza la etiqueta con asociación por id", () => {
        render(<Select id="categoria" label="Categoría" options={options} />);
        expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    });

    it("muestra el mensaje de error", () => {
        render(<Select options={options} error="Obligatorio" />);
        expect(screen.getByText("Obligatorio")).toBeInTheDocument();
    });

    it("aplica clase de error al select cuando hay error", () => {
        render(<Select options={options} error="Error" />);
        expect(screen.getByRole("combobox")).toHaveClass("border-danger");
    });

    it("dispara onChange al seleccionar una opción", async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<Select options={options} onChange={handleChange} />);
        await user.selectOptions(screen.getByRole("combobox"), "opt2");
        expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("reserva anchura mínima para el texto de la opción", () => {
        // `w-full` es un porcentaje y no aporta anchura intrínseca: dentro de una fila
        // flexible el campo se quedaba en sus 48 px de relleno —`pl-3` + `pr-9`— y se veía
        // el chevron **sin una sola letra**. Reportado desde la columna de acciones de
        // usuarios. Se rompe en silencio: el desplegable sigue funcionando.
        render(<Select options={options} />);

        expect(screen.getByRole("combobox")).toHaveClass("min-w-28");
    });

    // T1-14, igual que en `Input`: el error debe estar atado al campo.
    describe("accesibilidad del error", () => {
        it("marca el campo como inválido y ata el mensaje al select", () => {
            render(<Select id="categoria" label="Categoría" options={options} error="Obligatorio" />);
            const select = screen.getByLabelText("Categoría");

            expect(select).toHaveAttribute("aria-invalid", "true");
            expect(select).toHaveAccessibleDescription("Obligatorio");
            expect(select).toHaveAttribute("aria-describedby", "categoria-error");
        });

        it("anuncia el mensaje en cuanto aparece", () => {
            render(<Select id="categoria" options={options} error="Obligatorio" />);
            expect(screen.getByRole("alert")).toHaveTextContent("Obligatorio");
        });

        it("sin error no queda ningún atributo ARIA residual", () => {
            render(<Select id="categoria" label="Categoría" options={options} />);
            const select = screen.getByLabelText("Categoría");

            expect(select).not.toHaveAttribute("aria-invalid");
            expect(select).not.toHaveAttribute("aria-describedby");
        });
    });
});
