import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route, Link } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import App from "@/App";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { name: "Ana", role: "USER" }, isLoading: false, isError: false }),
}));
vi.mock("@/modules/auth/hooks/useLogout", () => ({
    useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

// El enlace vive en el contenido de la página, no en el menú: navegar por él NO
// dispara el `onNavigate` del menú. Es la vía que antes cubría un efecto y que
// ahora depende de derivar el estado en render (T1-10).
function layoutConEnlaceExterno() {
    return (
        <Routes>
            <Route element={<App />}>
                <Route index element={<Link to="/reports">Ir a reportes</Link>} />
                <Route path="reports" element={<p>Contenido de reportes</p>} />
            </Route>
        </Routes>
    );
}

describe("App — menú móvil", () => {
    it("abre y cierra el menú con el botón hamburguesa", async () => {
        const user = userEvent.setup();
        renderWithProviders(layoutConEnlaceExterno());

        const abrir = screen.getByRole("button", { name: "Abrir menú de navegación" });
        expect(abrir).toHaveAttribute("aria-expanded", "false");

        await user.click(abrir);
        const cerrar = screen.getByRole("button", { name: "Cerrar menú de navegación" });
        expect(cerrar).toHaveAttribute("aria-expanded", "true");

        await user.click(cerrar);
        expect(screen.getByRole("button", { name: "Abrir menú de navegación" })).toHaveAttribute("aria-expanded", "false");
    });

    it("se cierra al navegar desde fuera del propio menú", async () => {
        const user = userEvent.setup();
        renderWithProviders(layoutConEnlaceExterno());

        await user.click(screen.getByRole("button", { name: "Abrir menú de navegación" }));
        expect(screen.getByRole("button", { name: "Cerrar menú de navegación" })).toBeInTheDocument();

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));

        expect(await screen.findByText("Contenido de reportes")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Abrir menú de navegación" })).toHaveAttribute("aria-expanded", "false");
    });

    it("se cierra al pulsar un enlace del propio menú", async () => {
        const user = userEvent.setup();
        renderWithProviders(layoutConEnlaceExterno());

        await user.click(screen.getByRole("button", { name: "Abrir menú de navegación" }));

        // La navegación de escritorio también está en el DOM (jsdom no aplica
        // `lg:hidden`), así que hay que acotar la búsqueda al panel móvil.
        const menu = document.getElementById("mobile-menu");
        if (!menu) throw new Error("el menú móvil no está en el DOM");
        await user.click(within(menu).getByRole("link", { name: "Reportes" }));

        expect(await screen.findByText("Contenido de reportes")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Abrir menú de navegación" })).toHaveAttribute("aria-expanded", "false");
    });
});

/**
 * T2-11 — saltar la navegación (WCAG 2.4.1).
 *
 * Lo que hay que comprobar no es que el enlace exista, sino las dos cosas que lo
 * hacen útil: que sea **el primero** que recibe el foco al tabular, y que
 * activarlo deje el foco **dentro** del contenido. Un enlace de salto que solo
 * desplaza la página no sirve: la siguiente pulsación de Tab devuelve al usuario
 * al principio de la navegación que quería saltarse.
 */
describe("App — saltar al contenido (T2-11)", () => {
    it("la primera pulsación de Tab lo revela", async () => {
        const user = userEvent.setup();
        renderWithProviders(layoutConEnlaceExterno());

        await user.tab();

        const salto = screen.getByRole("link", { name: "Saltar al contenido principal" });
        expect(salto).toHaveFocus();
    });

    it("activarlo mueve el foco al contenido principal, no solo el scroll", async () => {
        const user = userEvent.setup();
        renderWithProviders(layoutConEnlaceExterno());

        await user.tab();
        await user.keyboard("{Enter}");

        const contenido = document.getElementById("contenido");
        expect(contenido).not.toBeNull();
        expect(contenido).toHaveFocus();
    });

    it("apunta a un destino que existe y es enfocable por programa", () => {
        renderWithProviders(layoutConEnlaceExterno());

        const salto = screen.getByRole("link", { name: "Saltar al contenido principal" });
        expect(salto).toHaveAttribute("href", "#contenido");

        const destino = document.getElementById("contenido");
        expect(destino?.tagName).toBe("MAIN");
        expect(destino).toHaveAttribute("tabindex", "-1");
    });
});

describe("App — menú de usuario (T2-16)", () => {
    it("Escape lo cierra y devuelve el foco a su botón", async () => {
        const user = userEvent.setup();
        renderWithProviders(layoutConEnlaceExterno());

        const boton = screen.getByRole("button", { name: "Menú de usuario" });
        await user.click(boton);
        expect(screen.getByRole("menu")).toBeInTheDocument();

        await user.keyboard("{Escape}");

        expect(screen.queryByRole("menu")).not.toBeInTheDocument();
        expect(boton).toHaveFocus();
    });
});
