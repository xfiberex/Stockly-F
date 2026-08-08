import { render, screen } from "@testing-library/react";
import { Badge } from "@/shared/components/Badge";

// T2-36: las siete variantes (mitad semánticas, mitad decorativas) pasaron a cinco,
// todas con significado y atadas a los tokens de la paleta.
describe("Badge", () => {
    it("renderiza los children", () => {
        render(<Badge>Activo</Badge>);
        expect(screen.getByText("Activo")).toBeInTheDocument();
    });

    it("usa la variante neutra cuando no se especifica", () => {
        render(<Badge>Test</Badge>);
        expect(screen.getByText("Test")).toHaveClass("bg-surface-muted", "text-foreground-muted");
    });

    it.each([
        ["success", "bg-success-surface", "text-success"],
        ["warning", "bg-warning-surface", "text-warning"],
        ["danger", "bg-danger-surface", "text-danger"],
        ["info", "bg-info-surface", "text-info"],
        ["neutral", "bg-surface-muted", "text-foreground-muted"],
    ] as const)("la variante %s usa el par de tokens de su estado", (variant, fondo, texto) => {
        render(<Badge variant={variant}>Etiqueta</Badge>);
        expect(screen.getByText("Etiqueta")).toHaveClass(fondo, texto);
    });

    // El criterio de aceptación: ninguna utilidad cruda de la paleta de Tailwind.
    it("no usa utilidades de color crudas", () => {
        render(<Badge variant="danger">Sin color crudo</Badge>);
        expect(screen.getByText("Sin color crudo").className).not.toMatch(/(bg|text)-[a-z]+-\d{2,3}/);
    });

    it("aplica className adicional", () => {
        render(<Badge className="extra-clase">Label</Badge>);
        expect(screen.getByText("Label")).toHaveClass("extra-clase");
    });
});
