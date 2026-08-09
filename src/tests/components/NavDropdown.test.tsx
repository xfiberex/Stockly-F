import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { renderWithProviders } from "@/tests/utils";
import { NavDropdown } from "@/shared/components/NavDropdown";

// T2-16: `NavDropdown` —Catálogo, Órdenes, Admin— no tenía ningún atributo ARIA, y el
// cierre con Escape faltaba también en `UserMenu`. Sin Escape, la única salida de un
// menú abierto es tabular por todas sus opciones.
//
// Es un desplegable, no un `menu`: sus opciones tienen que seguir siendo **enlaces**.
// Con `role="menuitem"` se anunciarían como comandos y desaparecerían de la lista de
// enlaces del lector de pantalla; el E2E lo cazó al no encontrar «Productos» por rol.

const items = [
    { to: "/catalog/products", label: "Productos" },
    { to: "/catalog/tags", label: "Etiquetas" },
];

function render() {
    return renderWithProviders(<NavDropdown label="Catálogo" Icon={Squares2X2Icon} items={items} />);
}

describe("NavDropdown (T2-16)", () => {
    it("el botón dice que abre un menú y si está abierto", async () => {
        const user = userEvent.setup();
        render();

        const boton = screen.getByRole("button", { name: /Catálogo/ });
        expect(boton).toHaveAttribute("aria-haspopup", "menu");
        expect(boton).toHaveAttribute("aria-expanded", "false");

        await user.click(boton);

        expect(boton).toHaveAttribute("aria-expanded", "true");
        // El panel queda referenciado desde el botón, con el nombre de su sección.
        const panel = document.getElementById(boton.getAttribute("aria-controls")!);
        expect(panel).toHaveAttribute("aria-label", "Catálogo");
    });

    it("las opciones siguen siendo enlaces", async () => {
        const user = userEvent.setup();
        render();

        const boton = screen.getByRole("button", { name: /Catálogo/ });
        await user.click(boton);
        const panel = document.getElementById(boton.getAttribute("aria-controls")!)!;

        // Con `role="menuitem"` dejarían de anunciarse como enlaces y no saldrían en la
        // lista de enlaces del lector de pantalla, que es como se recorre un sitio.
        expect(within(panel).getAllByRole("link")).toHaveLength(2);
        expect(within(panel).queryAllByRole("menuitem")).toHaveLength(0);
    });

    it("Escape cierra el menú y devuelve el foco al botón", async () => {
        const user = userEvent.setup();
        render();

        const boton = screen.getByRole("button", { name: /Catálogo/ });
        await user.click(boton);
        expect(screen.getByRole("link", { name: "Productos" })).toBeInTheDocument();

        await user.keyboard("{Escape}");

        expect(screen.queryByRole("link", { name: "Productos" })).not.toBeInTheDocument();
        // Sin devolver el foco, este se queda en un elemento que ya no existe: el
        // navegador lo manda al `<body>` y el siguiente Tab reempieza por la página.
        expect(boton).toHaveFocus();
    });

    it("elegir una opción cierra el menú", async () => {
        const user = userEvent.setup();
        render();

        await user.click(screen.getByRole("button", { name: /Catálogo/ }));
        await user.click(screen.getByRole("link", { name: "Productos" }));

        expect(screen.queryByRole("link", { name: "Productos" })).not.toBeInTheDocument();
    });

    it("con el menú cerrado no queda ningún `aria-controls` apuntando a la nada", () => {
        render();

        expect(screen.getByRole("button", { name: /Catálogo/ })).not.toHaveAttribute("aria-controls");
    });
});
