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
        expect(screen.getByRole("textbox")).toHaveClass("border-red-500");
    });

    it("no aplica clases de error cuando no hay error", () => {
        render(<Input />);
        expect(screen.getByRole("textbox")).not.toHaveClass("border-red-500");
    });

    it("pasa atributos HTML al input (type, placeholder)", () => {
        render(<Input type="email" placeholder="usuario@ejemplo.com" />);
        const input = screen.getByPlaceholderText("usuario@ejemplo.com");
        expect(input).toHaveAttribute("type", "email");
    });
});
