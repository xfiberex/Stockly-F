import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/shared/components/Button";

describe("Button", () => {
    it("renderiza el texto de los children", () => {
        render(<Button>Guardar</Button>);
        expect(screen.getByRole("button", { name: /guardar/i })).toBeInTheDocument();
    });

    // T2-36: los literales (`bg-primary`, `bg-surface-muted`, `bg-danger`) pasaron a
    // tokens semánticos, así que el color de la aplicación se cambia desde la paleta.
    it("aplica variante primary por defecto", () => {
        render(<Button>Test</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-primary", "text-surface");
    });

    it("aplica variante secondary", () => {
        render(<Button variant="secondary">Test</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-surface-muted", "text-foreground");
    });

    it("aplica variante danger", () => {
        render(<Button variant="danger">Eliminar</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-danger", "text-surface");
    });

    it("aplica variante ghost", () => {
        render(<Button variant="ghost">Ghost</Button>);
        expect(screen.getByRole("button")).toHaveClass("bg-transparent", "text-foreground-muted");
    });

    it("ninguna variante usa utilidades de color crudas", () => {
        for (const variant of ["primary", "secondary", "danger", "ghost"] as const) {
            const { unmount } = render(<Button variant={variant}>Test</Button>);
            expect(screen.getByRole("button").className).not.toMatch(/(bg|text)-[a-z]+-\d{2,3}/);
            unmount();
        }
    });

    it("muestra spinner y deshabilita cuando isLoading=true", () => {
        render(<Button isLoading>Enviando</Button>);
        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        expect(button.querySelector("span.animate-spin")).toBeInTheDocument();
    });

    it("deshabilita cuando disabled=true", () => {
        render(<Button disabled>Guardar</Button>);
        expect(screen.getByRole("button")).toBeDisabled();
    });

    it("no muestra spinner cuando no está en loading", () => {
        render(<Button>Normal</Button>);
        expect(screen.getByRole("button").querySelector("span.animate-spin")).toBeNull();
    });

    it("llama a onClick al hacer clic", async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Clic</Button>);
        await user.click(screen.getByRole("button"));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("no llama a onClick cuando está deshabilitado", async () => {
        const user = userEvent.setup();
        const handleClick = vi.fn();
        render(
            <Button disabled onClick={handleClick}>
                Deshabilitado
            </Button>,
        );
        await user.click(screen.getByRole("button"));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it("acepta y aplica className extra", () => {
        render(<Button className="mi-clase-extra">Test</Button>);
        expect(screen.getByRole("button")).toHaveClass("mi-clase-extra");
    });
});
