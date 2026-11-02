import { render, screen, within } from "@testing-library/react";
import { Spinner } from "@/shared/components/Spinner";
import { Button } from "@/shared/components/Button";
import { EsqueletoLista, EsqueletoPagina, EsqueletoTabla, ZonaCargando } from "@/shared/components/Esqueleto";
import { CLAVE_DE_IDIOMA } from "@/shared/i18n/idioma";

// Esqueleto y spinner: lo que oye un lector de pantalla y la forma que ocupan. Cómo se mueven
// (el retraso, el pulso, el movimiento reducido) lo mira `cargas.test.ts` sobre el CSS.

afterEach(() => window.localStorage.removeItem(CLAVE_DE_IDIOMA));

describe("ZonaCargando", () => {
    it("es un `status` ocupado que dice «Cargando…», con las formas ocultas al lector", () => {
        render(<ZonaCargando className="space-y-3"><span data-testid="forma" /></ZonaCargando>);

        const zona = screen.getByRole("status");
        expect(zona).toHaveTextContent("Cargando…");
        expect(zona).toHaveAttribute("aria-busy", "true");
        expect(zona).toHaveClass("esqueleto");

        // La maquetación va al interior, que es el que contiene las formas y el que late.
        const interior = screen.getByTestId("forma").parentElement!;
        expect(interior).toHaveAttribute("aria-hidden", "true");
        expect(interior).toHaveClass("esqueleto-pulso", "space-y-3");
        expect(zona).not.toHaveClass("space-y-3");
    });

    it("en inglés dice «Loading…»", () => {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, "en");
        render(<ZonaCargando>x</ZonaCargando>);
        expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    });
});

describe("Formas", () => {
    it("EsqueletoTabla: una cabecera y las filas pedidas, con sus columnas, de 48 px", () => {
        render(<EsqueletoTabla filas={4} columnas={3} />);
        const interior = screen.getByRole("status").querySelector("[aria-hidden]")!;

        const filas = [...interior.children];
        expect(filas).toHaveLength(1 + 4);
        expect(filas.slice(1).every((f) => f.classList.contains("h-12"))).toBe(true);
        expect(filas.every((f) => f.children.length === 3)).toBe(true);
        expect(interior).toHaveClass("rounded-xl", "border", "bg-surface");
    });

    it("EsqueletoTabla sinTarjeta no pinta su propia tarjeta", () => {
        render(<EsqueletoTabla sinTarjeta />);
        const interior = screen.getByRole("status").querySelector("[aria-hidden]")!;
        expect(interior).not.toHaveClass("rounded-xl");
        expect(interior).not.toHaveClass("border");
    });

    it("EsqueletoLista: una tarjeta por fila", () => {
        render(<EsqueletoLista filas={3} />);
        expect(screen.getByRole("status").querySelector("[aria-hidden]")!.children).toHaveLength(3);
    });

    it("EsqueletoPagina dentro no repite el título ni el contenedor de página", () => {
        const { rerender } = render(<EsqueletoPagina cifras={2} />);
        const fuera = screen.getByRole("status").querySelector("[aria-hidden]")!;
        expect(fuera).toHaveClass("max-w-7xl");
        expect(fuera.children).toHaveLength(3); // título, cifras y cuerpo

        rerender(<EsqueletoPagina dentro cifras={2} />);
        const dentro = screen.getByRole("status").querySelector("[aria-hidden]")!;
        expect(dentro).not.toHaveClass("max-w-7xl");
        expect(dentro.children).toHaveLength(2);
    });
});

describe("Spinner", () => {
    it("solo, es un `status` con «Cargando…» y la rueda oculta", () => {
        const { container } = render(<Spinner />);
        expect(screen.getByRole("status")).toHaveTextContent("Cargando…");
        expect(container.querySelector(".animate-spin")).toHaveAttribute("aria-hidden", "true");
    });

    it("decorativo, no anuncia nada", () => {
        const { container } = render(<Spinner decorativo />);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(container.querySelector(".animate-spin")).toHaveAttribute("aria-hidden", "true");
    });

    it("en un botón ocupado lo dice el botón (`aria-busy`), no un `status` dentro", () => {
        render(<Button isLoading>Guardar</Button>);
        const boton = screen.getByRole("button", { name: "Guardar" });
        expect(boton).toHaveAttribute("aria-busy", "true");
        expect(within(boton).queryByRole("status")).not.toBeInTheDocument();
        // `span`: un `div` no puede ir dentro de un `<button>`.
        expect(boton.querySelector(".animate-spin")!.tagName).toBe("SPAN");
    });

    it("un botón normal no lleva `aria-busy`", () => {
        render(<Button>Guardar</Button>);
        expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    });
});
