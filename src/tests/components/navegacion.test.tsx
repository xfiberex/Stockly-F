import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import App from "@/App";

/**
 * T3-04 — el orden de la barra, fijado.
 *
 * El refactor sustituye `navLinks.slice(0, 1)` y `navLinks.slice(1)` por un único array
 * de elementos con `kind`. El criterio de aceptación pide que la navegación siga
 * renderizando en el mismo orden, y hasta ahora **nada lo comprobaba**: el orden vivía en
 * dos expresiones de índices que había que leer juntas para reconstruirlo.
 *
 * Estos tests son el guardián que faltaba. Sin ellos, el refactor se «verifica» abriendo
 * la aplicación y mirando, que es justo lo que no sobrevive a la siguiente sesión.
 */

let rol = "ADMIN";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { name: "Ana", email: "ana@stockly.app", role: rol }, isLoading: false, isError: false }),
}));
vi.mock("@/modules/auth/hooks/useLogout", () => ({
    useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

function layout() {
    return (
        <Routes>
            <Route element={<App />}>
                <Route index element={<p>Inicio</p>} />
                <Route path="reports" element={<p>Reportes</p>} />
                {/* El texto no puede repetir el rótulo del enlace: si no, buscarlo
                    encuentra dos elementos y el test falla por ambigüedad, no por el fallo. */}
                <Route path="catalog/products" element={<p>Contenido del catálogo</p>} />
            </Route>
        </Routes>
    );
}

/**
 * Con el menú móvil cerrado, lo único que hay en el DOM es la navegación de escritorio:
 * jsdom no aplica `lg:hidden`, pero el panel móvil solo se monta al abrirlo.
 */
function rotulosDeEscritorio(): string[] {
    const barra = document.querySelector("nav");
    if (!barra) throw new Error("no hay barra de navegación");

    return Array.from(barra.querySelectorAll("a[href], button"))
        .map((el) => el.textContent?.trim() ?? "")
        // Fuera la marca, el menú de usuario y la hamburguesa: no son navegación de sección.
        .filter((texto) => ["Dashboard", "Catálogo", "Órdenes", "Reportes", "Admin"].includes(texto));
}

beforeEach(() => {
    rol = "ADMIN";
});

describe("Orden de la barra de navegación (T3-04)", () => {
    it("escritorio: los desplegables van entre Dashboard y Reportes", () => {
        renderWithProviders(layout());

        expect(rotulosDeEscritorio()).toEqual(["Dashboard", "Catálogo", "Órdenes", "Reportes", "Admin"]);
    });

    it("un USER ve lo mismo menos Admin", () => {
        rol = "USER";
        renderWithProviders(layout());

        expect(rotulosDeEscritorio()).toEqual(["Dashboard", "Catálogo", "Órdenes", "Reportes"]);
    });

    it("móvil: los enlaces sueltos arriba y las secciones debajo", async () => {
        // El móvil agrupa por tipo a propósito, no respeta el orden de la barra: los dos
        // enlaces juntos y luego las secciones con subtítulo. Se fija para que el
        // refactor no lo alinee con el escritorio sin querer.
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("button", { name: "Abrir menú de navegación" }));
        const panel = document.getElementById("mobile-menu");
        if (!panel) throw new Error("el menú móvil no está en el DOM");

        const rotulos = Array.from(panel.querySelectorAll("a[href], p"))
            .map((el) => el.textContent?.trim() ?? "")
            .filter(Boolean);

        expect(rotulos.slice(0, 2)).toEqual(["Dashboard", "Reportes"]);
        expect(rotulos.indexOf("Catálogo")).toBeGreaterThan(rotulos.indexOf("Reportes"));
        expect(rotulos.indexOf("Órdenes")).toBeGreaterThan(rotulos.indexOf("Catálogo"));
        expect(rotulos.indexOf("Admin")).toBeGreaterThan(rotulos.indexOf("Órdenes"));
    });

    it("los desplegables conservan sus destinos", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("button", { name: /Catálogo/ }));
        const panel = screen.getByRole("button", { name: /Catálogo/ }).parentElement;
        if (!panel) throw new Error("sin panel");

        for (const destino of ["Productos", "Categorías", "Marcas", "Proveedores", "Etiquetas"]) {
            expect(within(panel).getByRole("link", { name: destino })).toBeInTheDocument();
        }
    });

    it("el desplegable se resalta cuando la ruta activa le pertenece", async () => {
        // Es lo que antes daban `catalogActive` y `ordersActive`, dos variables sueltas en
        // el cuerpo del componente. Ahora cada desplegable trae su propia regla, y sin un
        // test nadie notaría que se perdió al mover la lógica al array.
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("button", { name: /Catálogo/ }));
        await user.click(screen.getByRole("link", { name: "Productos" }));

        expect(await screen.findByText("Contenido del catálogo")).toBeInTheDocument();
        // `text-info` es el color de estado que marca la sección activa (T2-36).
        expect(screen.getByRole("button", { name: /Catálogo/ })).toHaveClass("text-info");
        expect(screen.getByRole("button", { name: /Órdenes/ })).not.toHaveClass("text-info");
    });
});
