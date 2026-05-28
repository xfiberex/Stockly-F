import { render, screen } from "@testing-library/react";
import { Badge } from "@/shared/components/Badge";

describe("Badge", () => {
    it("renderiza los children", () => {
        render(<Badge>Activo</Badge>);
        expect(screen.getByText("Activo")).toBeInTheDocument();
    });

    it("aplica variante default (gris) cuando no se especifica variante", () => {
        render(<Badge>Test</Badge>);
        expect(screen.getByText("Test")).toHaveClass("bg-gray-100", "text-gray-700");
    });

    it("aplica variante success (verde)", () => {
        render(<Badge variant="success">Activo</Badge>);
        expect(screen.getByText("Activo")).toHaveClass("bg-green-100", "text-green-700");
    });

    it("aplica variante danger (rojo)", () => {
        render(<Badge variant="danger">Inactivo</Badge>);
        expect(screen.getByText("Inactivo")).toHaveClass("bg-red-100", "text-red-700");
    });

    it("aplica variante blue", () => {
        render(<Badge variant="blue">Electrónica</Badge>);
        expect(screen.getByText("Electrónica")).toHaveClass("bg-blue-100");
    });

    it("aplica variante purple", () => {
        render(<Badge variant="purple">Periféricos</Badge>);
        expect(screen.getByText("Periféricos")).toHaveClass("bg-purple-100");
    });

    it("aplica variante orange", () => {
        render(<Badge variant="orange">Accesorios</Badge>);
        expect(screen.getByText("Accesorios")).toHaveClass("bg-orange-100");
    });

    it("aplica variante teal", () => {
        render(<Badge variant="teal">Audio</Badge>);
        expect(screen.getByText("Audio")).toHaveClass("bg-teal-100");
    });

    it("aplica className adicional", () => {
        render(<Badge className="extra-clase">Label</Badge>);
        expect(screen.getByText("Label")).toHaveClass("extra-clase");
    });
});
