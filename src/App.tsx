import { useState, useEffect, type ComponentType, type SVGProps } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import {
    CubeIcon,
    UserCircleIcon,
    ChevronDownIcon,
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon,
    ClipboardDocumentListIcon,
    Squares2X2Icon,
    HomeIcon,
    ChartBarIcon,
    Bars3Icon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { useMenuDesplegable } from "@/shared/hooks/useMenuDesplegable";
import { clasesDeItemDeMenu, CLASES_PANEL_DE_MENU } from "@/shared/lib/clasesDeItemDeMenu";
import { AnuncioDeRuta } from "@/shared/components/AnuncioDeRuta";
import { useLogout } from "@/modules/auth/hooks/useLogout";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";

/**
 * T3-04 — la navegación, en un solo array y en su orden real.
 *
 * Antes eran cuatro arrays y el orden de la barra no estaba en ninguno: los dos enlaces
 * sueltos vivían juntos en `navLinks` y se separaban al pintarlos con `navLinks.slice(0, 1)`
 * y `navLinks.slice(1)` para colar los desplegables en medio. Añadir «Reportes» al final
 * exigía darse cuenta de que el índice 1 significaba «después de Órdenes».
 *
 * Ahora el array **es** el orden. Cada elemento dice de qué tipo es, y quien pinta decide
 * cómo, no cuándo.
 *
 * T4-10 — y el orden es **uno solo**. Hasta ahora el móvil agrupaba por tipo —los enlaces
 * sueltos arriba y las secciones debajo— y el escritorio los intercalaba, así que había dos
 * recorridos que mantener sincronizados a mano. Con la barra lateral los dos envoltorios
 * pintan la misma lista, en el orden del array, y un destino nuevo aparece en los dos sitios
 * sin tocar nada más.
 */
// T4-04: `label` es la **clave** del catálogo, no el rótulo. Este array se construye al
// cargar el módulo y el idioma se decide al pintar, así que un texto ya traducido se
// quedaría congelado en el que hubiera al arrancar. Los destinos reutilizan las claves
// `ruta.*`: el rótulo del enlace y el título de la sección son el mismo texto.
type EnlaceDeNav = {
    kind: "link";
    to: string;
    label: Clave;
    end: boolean;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

/**
 * T4-10: antes esto era un `dropdown` —un botón que abría un panel—. Ahora es un
 * **grupo**: un subtítulo con sus destinos debajo, siempre desplegado. Se cayeron con él
 * dos campos que solo tenían sentido en un panel flotante: `width`, que fijaba el ancho
 * al rótulo más largo, y `activoEn`, que existía para resaltar el disparador cuando la
 * ruta activa pertenecía al menú. Sin disparador que resaltar, la marca la pone cada
 * `NavLink` en su propio enlace, que además es donde el usuario la busca.
 */
type GrupoDeNav = {
    kind: "group";
    label: Clave;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    items: { to: string; label: Clave }[];
    soloAdmin?: boolean;
};

type ElementoDeNav = EnlaceDeNav | GrupoDeNav;

const NAVEGACION: ElementoDeNav[] = [
    { kind: "link", to: "/", label: "ruta.dashboard", end: true, Icon: HomeIcon },
    {
        kind: "group",
        label: "ruta.catalogo",
        Icon: Squares2X2Icon,
        items: [
            { to: "/catalog/products", label: "ruta.productos" },
            { to: "/catalog/categories", label: "ruta.categorias" },
            { to: "/catalog/brands", label: "ruta.marcas" },
            { to: "/catalog/suppliers", label: "ruta.proveedores" },
            { to: "/catalog/tags", label: "ruta.etiquetas" },
        ],
    },
    {
        kind: "group",
        label: "nav.ordenes",
        Icon: ClipboardDocumentListIcon,
        items: [
            { to: "/purchase-orders", label: "nav.compra" },
            { to: "/sale-orders", label: "nav.venta" },
        ],
    },
    { kind: "link", to: "/reports", label: "ruta.reportes", end: false, Icon: ChartBarIcon },
    {
        kind: "group",
        label: "nav.admin",
        Icon: ShieldCheckIcon,
        soloAdmin: true,
        items: [
            { to: "/admin/users", label: "ruta.usuarios" },
            { to: "/audit-logs", label: "nav.auditoria" },
            { to: "/settings", label: "ruta.configuracion" },
        ],
    },
];

/** El grupo de administración solo existe para quien lo es. */
const visibleDeNav = (elemento: ElementoDeNav, isAdmin: boolean) =>
    elemento.kind !== "group" || !elemento.soloAdmin || isAdmin;

function UserMenu({ name, email }: { name: string; email?: string }) {
    // T2-16: el cierre al pulsar fuera estaba duplicado con `NavDropdown` y ninguno de
    // los dos cerraba con Escape. Los dos usan ahora el mismo hook.
    const { abierto: open, contenedor, disparador, alternar, cerrar } = useMenuDesplegable();
    const logout = useLogout();
    const { t } = useT();

    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <div ref={contenedor} className="relative">
            <button
                ref={disparador}
                onClick={alternar}
                // **El nombre visible va dentro del accesible** (WCAG 2.5.3, «Label in
                // Name»). Con `aria-label="Menú de usuario"` a secas, el botón enseñaba
                // «Admin Principal» y se anunciaba con otro texto: quien maneja el
                // ordenador por voz dice lo que ve —«pulsa Admin Principal»— y no pasa
                // nada, porque ese texto no está en el nombre. Lighthouse lo marca como
                // `label-content-name-mismatch`.
                aria-label={t("nav.menuUsuarioDe", { nombre: name })}
                aria-haspopup="menu"
                aria-expanded={open}
                // El disparador se delimita igual que los ítems que abre: borde
                // transparente en reposo, y visible al señalarlo, al enfocarlo con el
                // teclado y **mientras está abierto**, para que se lea como una sola
                // pieza con el panel de debajo.
                className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors md:min-h-0",
                    "hover:border-border hover:bg-surface-muted",
                    "focus-visible:border-border focus-visible:bg-surface-muted focus-visible:outline-none",
                    open && "border-border bg-surface-muted",
                )}
            >
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-surface text-xs font-semibold shrink-0">
                    {initials}
                </div>
                <span className="text-sm text-foreground font-medium hidden sm:block max-w-36 truncate">{name}</span>
                <ChevronDownIcon className={cn("h-3.5 w-3.5 text-foreground-muted transition-transform hidden sm:block", open && "rotate-180")} />
            </button>

            {open && (
                <div role="menu" className={cn("absolute right-0 top-full mt-1.5 w-56 z-50", CLASES_PANEL_DE_MENU)}>
                    {/* Cabecera: de quién es la sesión. En el disparador el nombre se
                        recorta a 144 px y en pantallas pequeñas ni se ve, así que este
                        es el único sitio donde la cuenta se lee entera. No es un ítem
                        —no se pulsa—, y por eso queda fuera del `role="menu"`. */}
                    <div role="none" className="px-3 pt-2 pb-2.5">
                        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                        {email && <p className="truncate text-xs text-foreground-muted">{email}</p>}
                    </div>
                    <div className="border-t border-border" />
                    <Link
                        to="/profile"
                        role="menuitem"
                        onClick={cerrar}
                        className={clasesDeItemDeMenu("text-foreground")}
                    >
                        <UserCircleIcon className="h-4 w-4 text-foreground-muted" />
                        {t("ruta.perfil")}
                    </Link>
                    <div className="border-t border-border" />
                    <button
                        onClick={() => { cerrar(); logout.mutate(); }}
                        role="menuitem"
                        disabled={logout.isPending}
                        // La acción destructiva delimita en su propio color, no en el
                        // borde neutro: el recuadro dice «esto es otra cosa».
                        className={clasesDeItemDeMenu(
                            "text-danger hover:border-danger hover:bg-danger-surface focus-visible:border-danger focus-visible:bg-danger-surface disabled:opacity-50",
                        )}
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        {t("nav.cerrarSesion")}
                    </button>
                </div>
            )}
        </div>
    );
}

// Mismo trato que los ítems de un menú: la caja se delimita al señalarla o al llegar
// con el teclado. `min-h-11` es el mínimo táctil del sistema de diseño; en la barra
// lateral, que solo se maneja con ratón y teclado, la lista se aprieta a 36 px para que
// las doce entradas quepan sin desplazamiento en una pantalla de portátil.
const claseDeEnlaceDeNav = ({ isActive }: { isActive: boolean }) =>
    cn(
        "flex min-h-11 items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-colors lg:min-h-9 lg:py-1.5",
        "focus-visible:border-border focus-visible:outline-none",
        isActive
            // La sección en la que estás lleva su borde puesto, sin esperar al cursor.
            // `NavLink` añade además `aria-current="page"`: el color no puede ser la
            // única señal (WCAG 1.4.1) y quien no lo ve necesita que se lo digan.
            ? "border-info/30 bg-info-surface text-info"
            : "text-foreground hover:border-border hover:bg-surface-muted",
    );

/**
 * T4-10 — el recorrido de secciones, escrito una sola vez.
 *
 * Lo pintan los dos envoltorios: el panel desplegable de móvil y la barra lateral de
 * escritorio. Son dos cajas distintas alrededor de la **misma** lista, y esa es la razón
 * de que ahora haya un solo orden: mientras cada uno tenía el suyo, cada destino nuevo
 * había que darlo de alta dos veces y nada avisaba si se olvidaba uno.
 */
function ListaDeSecciones({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
    const { t } = useT();

    return (
        <div className="space-y-4">
            {NAVEGACION.filter((elemento) => visibleDeNav(elemento, isAdmin)).map((elemento) =>
                elemento.kind === "link" ? (
                    <div key={elemento.to} className="space-y-1">
                        <NavLink to={elemento.to} end={elemento.end} onClick={onNavigate} className={claseDeEnlaceDeNav}>
                            <elemento.Icon className="h-4 w-4" />
                            {t(elemento.label)}
                        </NavLink>
                    </div>
                ) : (
                    <div key={elemento.label}>
                        {/* El subtítulo **no es un encabezado**. Rotula un grupo de enlaces
                            dentro de una navegación, no abre una sección de contenido:
                            colarlo como `<h2>` lo mete en el esquema del documento y en el
                            listado de encabezados con el que un lector de pantalla recorre
                            la página, por delante del `<h1>` de la pantalla. */}
                        <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                            <elemento.Icon className="h-3.5 w-3.5" />
                            {t(elemento.label)}
                        </p>
                        <div className="space-y-1">
                            {elemento.items.map(({ to, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={onNavigate}
                                    className={(estado) =>
                                        // Los destinos de un grupo no llevan icono, así que su
                                        // texto arrancaba 26 px a la izquierda del de «Dashboard»
                                        // y «Reportes» —el icono más su hueco—: la lista se leía
                                        // como si los hijos fueran los de fuera. `pl-9.5` son los
                                        // 12 px del relleno más esos 26: alinea los rótulos en
                                        // una sola columna y deja el subtítulo mandando sobre lo
                                        // que tiene debajo.
                                        cn(claseDeEnlaceDeNav(estado), "pl-9.5")
                                    }
                                >
                                    {t(label)}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ),
            )}
        </div>
    );
}

function App() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const { pathname } = useLocation();
    const { t } = useT();

    // El menú se cierra solo al cambiar de ruta, sin sincronizarlo con un efecto:
    // se guarda la ruta en la que se abrió y el estado se deriva en render. Al
    // navegar, `openedAt` deja de coincidir con `pathname` y el menú desaparece,
    // venga la navegación de un enlace del propio menú o del historial del navegador.
    const [openedAt, setOpenedAt] = useState<string | null>(null);
    const mobileOpen = openedAt === pathname;

    const toggleMobile = () => setOpenedAt((actual) => (actual === pathname ? null : pathname));
    const closeMobile = () => setOpenedAt(null);

    /*
     * Con el menú abierto, la página de detrás se queda quieta.
     *
     * El panel tapa la pantalla entera y aun así el documento seguía desplazándose debajo:
     * se arrastraba sobre el menú y lo que se movía era el contenido, con el menú yéndose
     * con él. `overscroll-contain` en el panel evita el encadenamiento cuando el gesto
     * empieza *dentro*; esto cubre el resto de la superficie.
     *
     * Es un efecto y no una clase porque el elemento está fuera del árbol de React. La
     * limpieza **restaura el valor anterior en vez de borrarlo**: escribir `""` a ciegas
     * pisaría cualquier otro bloqueo —el de un modal abierto a la vez—, y el fallo saldría
     * como una página que ya no se desplaza y nadie sabe por qué.
     *
     * **Se bloquea `<html>`, no `<body>`, y esto costó una medición.** Con `overflow:
     * hidden` solo en el `<body>` el resultado parece correcto y no lo es: quien desplaza
     * aquí es el elemento raíz —`document.scrollingElement` es `<html>`—, así que la
     * página seguía moviéndose 800 px con el menú abierto. Comprobado en el navegador
     * antes y después.
     */
    useEffect(() => {
        if (!mobileOpen) return;

        const raiz = document.documentElement;
        const anterior = raiz.style.overflow;
        raiz.style.overflow = "hidden";

        return () => {
            raiz.style.overflow = anterior;
        };
    }, [mobileOpen]);

    return (
        <div className="min-h-screen bg-background">
            {/*
              T2-11 — saltar la navegación (WCAG 2.4.1, nivel A).
              La barra repite entre 3 y 12 controles en todas las páginas: sin esto,
              quien navega con teclado o lector de pantalla los recorre enteros en
              cada cambio de página antes de llegar al contenido.
              Está siempre en el DOM y es el primer elemento enfocable; solo se
              muestra al recibir el foco (`sr-only` + `focus:not-sr-only`), así que
              no ocupa sitio para quien no lo necesita.
            */}
            <a
                href="#contenido"
                onClick={(e) => {
                    // El navegador enfoca el destino de un fragmento si es enfocable,
                    // pero no todos lo hacen igual y ninguno lo hace en jsdom. Moverlo a
                    // mano deja el comportamiento decidido aquí —y comprobable por un
                    // test— en vez de a merced del navegador. Se evita además ensuciar
                    // el historial con `#contenido`.
                    // El desplazamiento se manda a mano y el foco va con `preventScroll`:
                    // dejárselo a `focus()` sale mal justo aquí, porque `<main>` es más
                    // alto que la ventana y el navegador desplaza *lo mínimo*, lo que
                    // alinea su final con el borde inferior en vez de mostrar el título.
                    e.preventDefault();
                    window.scrollTo(0, 0);
                    document.getElementById("contenido")?.focus({ preventScroll: true });
                }}
                // `ring-offset-background` (T4-11): el hueco del anillo lo pinta Tailwind de
                // blanco por defecto y el enlace flota sobre el fondo de página, así que en
                // tema oscuro el foco quedaba rodeado de un halo blanco.
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            >
                {t("nav.saltarAlContenido")}
            </a>
            {/*
              T2-18 — mueve el foco a `<main>` y anuncia el título en cada cambio de
              ruta. Va aquí, junto al enlace de salto, porque los dos resuelven la misma
              carencia: en una SPA nada avisa de que la página ha cambiado.
            */}
            <AnuncioDeRuta />
            {/*
              T4-10: la barra superior deja de ser navegación y pasa a ser `<header>`.
              De `lg` en adelante ya no lleva ningún destino —se los ha llevado la barra
              lateral— y lo que queda es la marca, la sesión y, por debajo de `lg`, el
              botón que abre el panel. Marcarla como `<nav>` cuando no navega dejaría un
              *landmark* vacío que un lector de pantalla ofrece y no lleva a ninguna parte.
            */}
            <header className="sticky top-0 z-40 border-b border-border bg-surface">
                <div className="px-4 sm:px-6 flex h-14 items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                        {/* La marca va en el acento de la paleta, no en el informativo. */}
                        <CubeIcon className="h-5 w-5 text-accent" />
                        Stockly
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                        {user && <UserMenu name={user.name} email={user.email} />}
                        {/* Botón hamburguesa — solo móvil/tablet */}
                        <button
                            onClick={toggleMobile}
                            aria-label={mobileOpen ? t("nav.cerrarMenu") : t("nav.abrirMenu")}
                            aria-expanded={mobileOpen}
                            aria-controls="mobile-menu"
                            // Solo existe por debajo de `lg`, así que siempre se pulsa con el dedo.
                            className="lg:hidden flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-foreground-muted hover:bg-surface-muted transition-colors"
                        >
                            {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    /*
                     * **El menú se desplaza por dentro; la página, no.**
                     *
                     * Con doce entradas, el panel es más alto que la pantalla de un teléfono.
                     * Antes no tenía altura máxima, así que al arrastrar sobre él lo que se
                     * movía era la página de detrás —el menú se iba con ella y el contenido
                     * pasaba por debajo—, que es justo lo que no debe hacer algo que está
                     * por encima.
                     *
                     * Tres piezas, y hacen falta las tres:
                     *
                     * - `max-h` restado a la altura de la barra (56 px) para que el panel
                     *   quepa y sea él quien tenga desplazamiento propio. En **`dvh` y no
                     *   `vh`**: en móvil la barra del navegador aparece y desaparece, y `vh`
                     *   se queda con la ventana grande, así que las últimas entradas caen
                     *   debajo del borde y no hay forma de llegar.
                     * - `overscroll-contain` corta el *encadenamiento*: al llegar al final
                     *   del panel, el gesto **no** continúa desplazando el documento.
                     * - El bloqueo de `<html>` mientras está abierto, en el efecto de arriba.
                     */
                    <nav
                        id="mobile-menu"
                        aria-label={t("nav.secciones")}
                        className="lg:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain sin-barra border-t border-border bg-surface px-4 py-3"
                    >
                        <ListaDeSecciones isAdmin={isAdmin} onNavigate={closeMobile} />
                    </nav>
                )}
            </header>

            <div className="lg:flex">
                {/*
                  T4-10 — la barra lateral, de 1024 px en adelante.
                  Con doce módulos repartidos en tres desplegables, alcanzar la mayoría de
                  destinos costaba dos interacciones y la barra no decía dónde estabas.
                  Desplegada, cada sección está a un clic y la actual va marcada.

                  `sticky top-14` la ancla justo debajo de la cabecera, y la altura restada
                  —la misma cuenta que el panel móvil— es lo que le da desplazamiento
                  propio: sin ella, en una pantalla corta las últimas entradas quedan fuera
                  y solo se llega bajando la página entera, con la barra yéndose con ella.

                  **`aria-hidden` no hace falta y sería un error:** por debajo de `lg` el
                  `hidden` de Tailwind es `display: none`, así que ni se anuncia ni se
                  tabula. El panel móvil, que lleva el mismo `aria-label`, es el único
                  visible ahí, y al revés de `lg` en adelante.
                */}
                <nav
                    aria-label={t("nav.secciones")}
                    className="hidden lg:block sticky top-14 h-[calc(100dvh-3.5rem)] w-60 shrink-0 overflow-y-auto overscroll-contain sin-barra border-r border-border bg-surface px-3 py-4"
                >
                    <ListaDeSecciones isAdmin={isAdmin} />
                </nav>

                {/*
                  `tabIndex={-1}` no lo mete en el orden de tabulación: lo hace
                  enfocable *por programa*, que es lo que necesita el salto. Sin él, el
                  navegador desplaza la página pero deja el foco donde estaba y la
                  siguiente pulsación de Tab vuelve al principio de la navegación —el
                  fallo clásico que hace inútil un enlace de salto.

                  **`min-w-0` no es adorno.** En una fila flexible el mínimo de un elemento
                  es su contenido, no cero: sin esto, las tablas de `min-w-160` empujan el
                  `<main>` más allá del ancho de la ventana y la página entera se desplaza
                  a lo ancho, arrastrando la cabecera. Es el mismo mecanismo que dejó los
                  selects sin texto, visto desde el otro lado.
                */}
                <main id="contenido" tabIndex={-1} className="outline-none min-w-0 flex-1">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default App;
