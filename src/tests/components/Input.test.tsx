import { render, screen } from "@testing-library/react";
import { Input } from "@/shared/components/Input";

describe("Input", () => {
    it("renderiza el elemento input", () => {
        render(<Input />);
        expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("renderiza la etiqueta con asociación por id", () => {
        render(<Input id="email" label="Correo electrónico" />);
        expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    });

    it("no renderiza label cuando no se provee", () => {
        render(<Input />);
        expect(screen.queryByText(/label/i)).toBeNull();
    });

    it("renderiza el mensaje de error", () => {
        render(<Input error="Campo obligatorio" />);
        expect(screen.getByText("Campo obligatorio")).toBeInTheDocument();
    });

    it("aplica clases de error al input cuando hay error", () => {
        render(<Input error="Error" />);
        expect(screen.getByRole("textbox")).toHaveClass("border-danger");
    });

    it("no aplica clases de error cuando no hay error", () => {
        render(<Input />);
        expect(screen.getByRole("textbox")).not.toHaveClass("border-danger");
    });

    it("pasa atributos HTML al input (type, placeholder)", () => {
        render(<Input type="email" placeholder="usuario@ejemplo.com" />);
        const input = screen.getByPlaceholderText("usuario@ejemplo.com");
        expect(input).toHaveAttribute("type", "email");
    });

    // T1-14. El borde rojo era el único indicador del error: sin relación
    // programática, un lector de pantalla anunciaba el campo como si estuviera bien.
    describe("accesibilidad del error", () => {
        it("marca el campo como inválido y ata el mensaje al input", () => {
            render(<Input id="email" label="Correo" error="Campo obligatorio" />);
            const input = screen.getByLabelText("Correo");

            expect(input).toHaveAttribute("aria-invalid", "true");
            expect(input).toHaveAccessibleDescription("Campo obligatorio");
            expect(input).toHaveAttribute("aria-describedby", "email-error");
        });

        it("anuncia el mensaje en cuanto aparece", () => {
            render(<Input id="email" label="Correo" error="Campo obligatorio" />);
            expect(screen.getByRole("alert")).toHaveTextContent("Campo obligatorio");
        });

        it("sin error no queda ningún atributo ARIA residual", () => {
            render(<Input id="email" label="Correo" />);
            const input = screen.getByLabelText("Correo");

            expect(input).not.toHaveAttribute("aria-invalid");
            expect(input).not.toHaveAttribute("aria-describedby");
            expect(screen.queryByRole("alert")).toBeNull();
        });
    });
});
