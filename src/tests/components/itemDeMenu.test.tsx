import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { renderWithProviders } from "@/tests/utils";
import { NavDropdown } from "@/shared/components/NavDropdown";
import { DropdownButton } from "@/shared/components/DropdownButton";
import { clasesDeItemDeMenu } from "@/shared/lib/clasesDeItemDeMenu";
import App from "@/App";
import { Routes, Route } from "react-router-dom";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Ana Pérez", email: "ana@stockly.app", role: "USER" } }),
}));
vi.mock("@/modules/auth/hooks/useLogout", () => ({
    useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

/** El menú de usuario vive dentro del layout, así que se monta el layout. */
function UserMenuDePrueba() {
    return (
        <Routes>
            <Route element={<App />}>
                <Route index element={<p>Contenido</p>} />
            </Route>
        </Routes>
    );
}

// Los ítems de menú son cajas delimitadas: el borde aparece al señalarlas con el ratón
// o al llegar con el teclado. jsdom no resuelve `:hover` ni `:focus-visible` —no aplica
// hojas de estilo—, así que lo que se comprueba aquí es que **todos** los ítems lleven
// el mismo juego de clases; el aspecto se verificó en el navegador.

describe("Ítems de menú delimitados", () => {
    it("el borde nace transparente, para que el texto no baile al señalar", () => {
        const clases = clasesDeItemDeMenu();

        expect(clases).toContain("border border-transparent");
        expect(clases).toContain("hover:border-border");
        // `focus-visible` y no `focus`: el recuadro es para quien llega con el teclado,
        // no para quien acaba de hacer clic.
        expect(clases).toContain("focus-visible:border-border");
        expect(clases).not.toContain("focus:border-border");
    });

    it("los enlaces de un desplegable de navegación lo llevan", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <NavDropdown
                label="Catálogo"
                Icon={Squares2X2Icon}
                items={[{ to: "/catalog/products", label: "Productos" }]}
            />,
        );

        await user.click(screen.getByRole("button", { name: /Catálogo/ }));

        expect(screen.getByRole("link", { name: "Productos" }).className).toContain("hover:border-border");
    });

    it("los de un menú de acciones también", async () => {
        const user = userEvent.setup();
        renderWithProviders(
            <DropdownButton label="Exportar" items={[{ label: "Exportar CSV", onClick: vi.fn() }]} />,
        );

        await user.click(screen.getByRole("button", { name: /Exportar/ }));

        expect(screen.getByRole("menuitem", { name: "Exportar CSV" }).className).toContain("border-transparent");
    });

    it("una acción destructiva se delimita en su propio color", () => {
        const clases = clasesDeItemDeMenu("text-danger hover:border-danger hover:bg-danger-surface");

        // El recuadro rojo dice «esto no es como los demás» antes de pulsarlo.
        expect(clases).toContain("hover:border-danger");
        expect(clases).toContain("hover:bg-danger-surface");
    });
});

// El disparador y la cabecera del menú de usuario, pedidos junto con los bordes.
describe("Menú de usuario — disparador y cabecera", () => {
    it("el disparador se delimita al abrirse, no solo al señalarlo", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UserMenuDePrueba />);

        const boton = screen.getByRole("button", { name: "Menú de usuario" });
        expect(boton.className).toContain("border-transparent");
        expect(boton.className).toContain("hover:border-border");

        await user.click(boton);

        // Abierto, el borde se queda: el disparador y el panel se leen como una pieza.
        expect(boton.className).toContain("border-border");
    });

    it("la cabecera dice de quién es la sesión, con el correo entero", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UserMenuDePrueba />);

        await user.click(screen.getByRole("button", { name: "Menú de usuario" }));

        const menu = screen.getByRole("menu");
        expect(within(menu).getByText("Ana Pérez")).toBeInTheDocument();
        // En el disparador el nombre se recorta y el correo no aparece nunca.
        expect(within(menu).getByText("ana@stockly.app")).toBeInTheDocument();
    });

    it("la cabecera no es una opción del menú", async () => {
        const user = userEvent.setup();
        renderWithProviders(<UserMenuDePrueba />);

        await user.click(screen.getByRole("button", { name: "Menú de usuario" }));

        // Dos ítems, los de siempre: la cabecera no se pulsa y no debe contarse.
        expect(screen.getAllByRole("menuitem")).toHaveLength(2);
    });
});
