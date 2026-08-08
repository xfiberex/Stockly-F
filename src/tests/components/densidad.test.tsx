import { render, screen } from "@testing-library/react";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Modal } from "@/shared/components/Modal";
import { DropdownButton } from "@/shared/components/DropdownButton";

/**
 * T2-40 — dos densidades en el mismo componente.
 *
 * Los píxeles reales se midieron en el navegador (jsdom no aplica Tailwind ni
 * resuelve `md:`), así que aquí solo se blinda el par de clases que produce esa
 * medida: `min-h-11` (44 px, mínimo táctil) hasta `md` y `md:min-h-9` (36 px,
 * perfil denso) a partir de ahí. Si alguien quita una de las dos, la regresión
 * se ve aquí en vez de en un móvil.
 */
const PAR_DE_DENSIDAD = ["min-h-11", "md:min-h-9"];

describe("Densidad y mínimo táctil (T2-40)", () => {
    it("el botón lleva las dos densidades, no una", () => {
        render(<Button>Guardar</Button>);
        expect(screen.getByRole("button")).toHaveClass(...PAR_DE_DENSIDAD);
    });

    it.each(["primary", "secondary", "danger", "ghost"] as const)(
        "la variante %s no pierde la densidad",
        (variant) => {
            render(<Button variant={variant}>Acción</Button>);
            expect(screen.getByRole("button")).toHaveClass(...PAR_DE_DENSIDAD);
        },
    );

    it("el campo de texto respeta el mínimo táctil", () => {
        render(<Input label="Nombre" />);
        expect(screen.getByLabelText("Nombre")).toHaveClass(...PAR_DE_DENSIDAD);
    });

    it("el desplegable de formulario respeta el mínimo táctil", () => {
        render(<Select label="Categoría" options={[{ value: "1", label: "Una" }]} />);
        expect(screen.getByLabelText("Categoría")).toHaveClass(...PAR_DE_DENSIDAD);
    });

    // Estos dos son cuadrados pequeños: sin ancho mínimo cumplirían de alto y
    // seguirían fallando de ancho, que es como estaban (28×28 el de cerrar).
    it("el botón de cerrar del modal es una diana de 44×44, no un icono suelto", () => {
        render(<Modal isOpen onClose={() => {}} title="Título">contenido</Modal>);
        expect(screen.getByLabelText("Cerrar")).toHaveClass("min-h-11", "min-w-11");
    });

    it("el menú desplegable de acciones también", () => {
        render(<DropdownButton label="Exportar" items={[{ label: "CSV", onClick: () => {} }]} />);
        expect(screen.getByRole("button", { name: /Exportar/ })).toHaveClass(...PAR_DE_DENSIDAD);
    });
});
