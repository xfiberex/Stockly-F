import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import App from "@/App";
import { DESTINOS, NAVEGACION_POR_ROL, grupoDeRuta, navegacionDe, type RutaDeNav } from "@/shared/navegacion";
import { CLAVE_DE_GRUPOS_ABIERTOS } from "@/shared/hooks/useGruposDeNav";
import { puede, type Rol } from "@/shared/contratos";

/**
 * T3-04 — el orden de la navegación, fijado.
 *
 * El refactor sustituyó `navLinks.slice(0, 1)` y `navLinks.slice(1)` por un único array de
 * elementos con `kind`. El criterio de aceptación pedía que la navegación siguiera
 * renderizando en el mismo orden, y hasta entonces **nada lo comprobaba**: el orden vivía
 * en dos expresiones de índices que había que leer juntas para reconstruirlo.
 *
 * T4-10 — y ahora el orden es **uno**. La barra lateral y el panel de móvil pintan la
 * misma lista, así que lo que estos tests vigilan ya no es que dos recorridos coincidan
 * con lo esperado por separado, sino que sigan siendo el mismo. Hasta T4-10 el móvil
 * agrupaba por tipo —enlaces sueltos arriba, secciones debajo— y el escritorio los
 * intercalaba; mantener dos órdenes obligaba a dar de alta cada destino nuevo dos veces.
 */

let rol: Rol = "ADMIN";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { name: "Ana", email: "ana@stockly.app", role: rol }, isLoading: false, isError: false }),
}));
vi.mock("@/modules/auth/hooks/useLogout", () => ({
    useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));
// La campana pide sus avisos a la API; aquí solo interesa el menú.
vi.mock("@/modules/notifications/components/CampanaDeAvisos", () => ({ CampanaDeAvisos: () => null }));

function layout() {
    return (
        <Routes>
            <Route element={<App />}>
                <Route index element={<p>Inicio</p>} />
                <Route path="reports" element={<p>Reportes</p>} />
                {/* El texto no puede repetir el rótulo del enlace: si no, buscarlo
                    encuentra dos elementos y el test falla por ambigüedad, no por el fallo. */}
                <Route path="catalog/products" element={<p>Contenido del catálogo</p>} />
                <Route path="purchase-orders/suggestions" element={<p>Contenido de sugerencias</p>} />
            </Route>
        </Routes>
    );
}

/** La barra lateral es el único `<nav>` montado mientras el panel móvil está cerrado. */
function barraLateral(): HTMLElement {
    const navs = Array.from(document.querySelectorAll("nav"));
    const lateral = navs.find((nav) => nav.id !== "mobile-menu");
    if (!lateral) throw new Error("no hay barra lateral");
    return lateral;
}

/**
 * Rótulos de un recorrido **tal como se ve**: los enlaces y los botones de grupo, en el orden en
 * que se leen, sin lo que está dentro de un grupo plegado (`hidden`).
 */
function recorrido(raiz: HTMLElement): string[] {
    return Array.from(raiz.querySelectorAll<HTMLElement>("a[href], button[aria-expanded]"))
        .filter((el) => !el.closest("[hidden]"))
        .map((el) => el.textContent?.trim() ?? "")
        .filter(Boolean);
}

/** Despliega todos los grupos cerrados de un recorrido. */
async function desplegarTodo(raiz: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
    for (const boton of within(raiz).queryAllByRole("button", { expanded: false })) await user.click(boton);
}

const RECORRIDO_ADMIN = [
    "Panel",
    // T6-08 — el mostrador, para quien puede vender en él.
    "Mostrador",
    "Catálogo", "Productos", "Categorías", "Marcas", "Proveedores", "Etiquetas",
    "Órdenes", "Compra", "Venta", "Clientes",
    // T5-14 — los conteos pasan a un grupo, con las transferencias y los almacenes.
    // T5-15 — y las caducidades: ir a retirar lo vencido es trabajo de almacén.
    "Inventario", "Conteos físicos", "Transferencias", "Caducidades", "Almacenes",
    "Reportes",
    "Admin", "Usuarios", "Auditoría", "Configuración",
];

beforeEach(() => {
    rol = "ADMIN";
    window.localStorage.clear();
});

describe("Orden de la navegación (T3-04, T4-10)", () => {
    it("la barra lateral sigue el orden del array, con cada grupo donde está", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());

        await desplegarTodo(barraLateral(), user);
        expect(recorrido(barraLateral())).toEqual(RECORRIDO_ADMIN);
    });

    it("un USER ve lo mismo menos el grupo de administración", async () => {
        rol = "USER";
        const user = userEvent.setup();
        renderWithProviders(layout());

        await desplegarTodo(barraLateral(), user);
        expect(recorrido(barraLateral())).toEqual(
            RECORRIDO_ADMIN.filter((rotulo) => !["Mostrador", "Admin", "Usuarios", "Auditoría", "Configuración"].includes(rotulo)),
        );
    });

    it("el panel de móvil pinta exactamente el mismo recorrido, con los mismos grupos abiertos", async () => {
        // Es lo que impide que vuelvan a ser dos listas. Antes de T4-10 este test
        // afirmaba lo contrario a propósito: el móvil agrupaba por tipo. Desde que los grupos
        // se pliegan, además, comparten estado: lo desplegado en la barra lo está en el panel.
        const user = userEvent.setup();
        renderWithProviders(layout());
        await desplegarTodo(barraLateral(), user);

        await user.click(screen.getByRole("button", { name: "Abrir menú de navegación" }));
        const panel = document.getElementById("mobile-menu");
        if (!panel) throw new Error("el menú móvil no está en el DOM");

        expect(recorrido(panel)).toEqual(RECORRIDO_ADMIN);
    });
});

describe("Barra lateral (T4-10)", () => {
    it("son dieciocho destinos: los sueltos a un clic y los de cada grupo detrás de su botón", () => {
        renderWithProviders(layout());
        const lateral = barraLateral();

        // T5-07 — trece desde que los conteos físicos tienen su sección; T5-06, catorce con los
        // clientes; T6-08, quince con el mostrador; T5-14, diecisiete con las transferencias y
        // los almacenes; T5-15, dieciocho con las caducidades.
        expect(lateral.querySelectorAll("a[href]")).toHaveLength(18);
        // 2026-11-15 — revisa T4-10, que no quería ningún botón: con veinte destinos el menú de
        // ADMIN no cabía. Un botón por grupo, que dice si está abierto y qué despliega.
        const botones = within(lateral).getAllByRole("button");
        expect(botones.map((b) => b.textContent)).toEqual(["Catálogo", "Órdenes", "Inventario", "Admin"]);
        for (const boton of botones) {
            expect(boton).toHaveAttribute("aria-expanded", "false");
            expect(document.getElementById(boton.getAttribute("aria-controls")!)).toHaveAttribute("hidden");
        }
    });

    it("la sección actual queda destacada, y no solo por el color", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());
        await user.click(within(barraLateral()).getByRole("button", { name: "Catálogo" }));

        await user.click(within(barraLateral()).getByRole("link", { name: "Productos" }));
        expect(await screen.findByText("Contenido del catálogo")).toBeInTheDocument();

        const activo = within(barraLateral()).getByRole("link", { name: "Productos" });
        // `text-info` es el color de estado que marca la sección activa (T2-36)…
        expect(activo).toHaveClass("text-info");
        // …y `aria-current` es lo que la marca para quien no lo ve (WCAG 1.4.1).
        expect(activo).toHaveAttribute("aria-current", "page");

        expect(within(barraLateral()).getByRole("link", { name: "Marcas" })).not.toHaveAttribute("aria-current");
    });

    it("tiene nombre propio: con dos recorridos en la página, «navegación» a secas no distingue", () => {
        renderWithProviders(layout());

        expect(barraLateral()).toHaveAttribute("aria-label", "Secciones");
    });

    it("la cabecera ya no es un landmark de navegación", () => {
        // De `lg` en adelante no lleva ningún destino. Dejarla como `<nav>` ofrecería a un
        // lector de pantalla una región de navegación que no navega a ninguna parte.
        renderWithProviders(layout());

        expect(document.querySelector("header")).not.toBeNull();
        // Con el panel cerrado, el único recorrido montado es el lateral.
        expect(document.querySelectorAll("nav")).toHaveLength(1);
    });
});

/**
 * 2026-11-15 — los grupos se pliegan (decisión del propietario, que revisa T4-10). Lo que no puede
 * perderse es lo que T4-10 vino a arreglar: que el menú diga dónde se está.
 */
describe("Grupos plegables", () => {
    it("empiezan cerrados: ADMIN ve siete líneas en vez de veintidós", () => {
        renderWithProviders(layout());

        expect(recorrido(barraLateral())).toEqual(["Panel", "Mostrador", "Catálogo", "Órdenes", "Inventario", "Reportes", "Admin"]);
    });

    it("el grupo de la pantalla abierta se abre solo, también desde una subruta", () => {
        renderWithProviders(layout(), { initialRoute: "/purchase-orders/suggestions" });
        const lateral = barraLateral();

        expect(within(lateral).getByRole("button", { name: "Órdenes" })).toHaveAttribute("aria-expanded", "true");
        expect(recorrido(lateral)).toContain("Compra");
        expect(within(lateral).getByRole("button", { name: "Catálogo" })).toHaveAttribute("aria-expanded", "false");
    });

    it("cerrado a mano, el grupo de la pantalla actual lo sigue diciendo; navegar lo vuelve a abrir", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout(), { initialRoute: "/catalog/products" });
        const catalogo = () => within(barraLateral()).getByRole("button", { name: /^Catálogo/ });

        await user.click(catalogo());
        expect(catalogo()).toHaveAttribute("aria-expanded", "false");
        // El color, un punto que no depende del color y el texto para el lector.
        expect(catalogo()).toHaveClass("text-info");
        expect(catalogo()).toHaveAccessibleName("Catálogo (contiene la pantalla actual)");

        await user.click(within(barraLateral()).getByRole("link", { name: "Panel" }));
        expect(catalogo()).not.toHaveClass("text-info");
        await user.click(catalogo());
        await user.click(within(barraLateral()).getByRole("link", { name: "Productos" }));
        expect(await screen.findByText("Contenido del catálogo")).toBeInTheDocument();
        expect(catalogo()).toHaveAttribute("aria-expanded", "true");
    });

    it("lo que se abre a mano se recuerda en el dispositivo, y lo que se cierra también", async () => {
        const user = userEvent.setup();
        const { unmount } = renderWithProviders(layout());
        await user.click(within(barraLateral()).getByRole("button", { name: "Inventario" }));
        expect(JSON.parse(window.localStorage.getItem(CLAVE_DE_GRUPOS_ABIERTOS)!)).toEqual(["inventario"]);
        unmount();

        renderWithProviders(layout());
        expect(within(barraLateral()).getByRole("button", { name: "Inventario" })).toHaveAttribute("aria-expanded", "true");
        await user.click(within(barraLateral()).getByRole("button", { name: "Inventario" }));
        expect(JSON.parse(window.localStorage.getItem(CLAVE_DE_GRUPOS_ABIERTOS)!)).toEqual([]);
    });

    it("lo guardado que no es un grupo, o no es JSON, se ignora en vez de romper el menú", () => {
        window.localStorage.setItem(CLAVE_DE_GRUPOS_ABIERTOS, JSON.stringify(["ordenes", "desaparecido", 3]));
        const { unmount } = renderWithProviders(layout());
        expect(within(barraLateral()).getByRole("button", { name: "Órdenes" })).toHaveAttribute("aria-expanded", "true");
        unmount();

        window.localStorage.setItem(CLAVE_DE_GRUPOS_ABIERTOS, "{roto");
        renderWithProviders(layout());
        expect(recorrido(barraLateral())).toEqual(["Panel", "Mostrador", "Catálogo", "Órdenes", "Inventario", "Reportes", "Admin"]);
    });

    it("cada ruta sabe su grupo, y los destinos sueltos no tienen ninguno", () => {
        expect(grupoDeRuta("/catalog/products/abc/movements")).toBe("catalogo");
        expect(grupoDeRuta("/admin/users")).toBe("admin");
        expect(grupoDeRuta("/")).toBeNull();
        expect(grupoDeRuta("/reports")).toBeNull();
        // Que empiece igual no basta: tiene que ser la ruta o una por debajo.
        expect(grupoDeRuta("/expiryx")).toBeNull();
    });
});

/**
 * AUD-016 — el menú de cada rol, con la lista exacta (`shared/navegacion.ts`).
 *
 * La crítica del 2026-11-07 vio a SELLER con 16 destinos para usar cuatro, y los de WAREHOUSE
 * empezando a ~600 px en el móvil, debajo de un catálogo que solo consulta. Un destino nuevo en
 * el menú de alguien tiene que pasar por aquí.
 */
describe("Navegación por rol (AUD-016)", () => {
    it("WAREHOUSE empieza por lo suyo: el inventario, después las órdenes; sin mostrador", async () => {
        rol = "WAREHOUSE";
        const user = userEvent.setup();
        renderWithProviders(layout());
        await desplegarTodo(barraLateral(), user);

        expect(recorrido(barraLateral())).toEqual([
            "Panel",
            "Inventario", "Conteos físicos", "Transferencias", "Caducidades", "Almacenes",
            "Órdenes", "Compra", "Venta",
            "Catálogo", "Productos",
            "Reportes",
        ]);
    });

    it("SELLER: el mostrador, sus ventas, sus clientes y los productos; ni panel ni administración", async () => {
        rol = "SELLER";
        const user = userEvent.setup();
        renderWithProviders(layout());
        await desplegarTodo(barraLateral(), user);

        expect(recorrido(barraLateral())).toEqual(["Mostrador", "Órdenes", "Venta", "Clientes", "Catálogo", "Productos"]);
        expect(within(barraLateral()).getByRole("link", { name: "Mostrador" })).toHaveAttribute("href", "/counter");
    });

    it("sin rol no hay menú", () => {
        expect(navegacionDe("PENDING")).toEqual([]);
        expect(navegacionDe(undefined)).toEqual([]);
    });

    it("ningún rol tiene en el menú un destino que su ruta no le abre", () => {
        // Las rutas guardadas de `routes/index.tsx`: el mostrador por permiso; las de
        // administración, solo ADMIN.
        const guardadas: Partial<Record<RutaDeNav, (r: Rol) => boolean>> = {
            "/counter": (r) => puede(r, "POST /sale-orders/counter"),
            "/admin/users": (r) => r === "ADMIN",
            "/audit-logs": (r) => r === "ADMIN",
            "/settings": (r) => r === "ADMIN",
        };
        for (const [r, lista] of Object.entries(NAVEGACION_POR_ROL) as [Rol, readonly RutaDeNav[]][]) {
            for (const destino of lista) expect([r, destino, guardadas[destino]?.(r) ?? true]).toEqual([r, destino, true]);
        }
    });

    it("todo destino está en el menú de algún rol, y ninguno sale dos veces en el mismo", () => {
        const usados = new Set(Object.values(NAVEGACION_POR_ROL).flat());
        expect([...usados].sort()).toEqual(Object.keys(DESTINOS).sort());
        for (const lista of Object.values(NAVEGACION_POR_ROL)) expect(new Set(lista).size).toBe(lista.length);
    });

    it("el menú de usuario dice con qué rol se ha entrado", async () => {
        rol = "WAREHOUSE";
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("button", { name: /Ana/ }));

        expect(within(screen.getByRole("menu")).getByText("Almacén")).toBeInTheDocument();
    });
});
