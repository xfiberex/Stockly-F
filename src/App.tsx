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
import { NavDropdown } from "@/shared/components/NavDropdown";
import { AnuncioDeRuta } from "@/shared/components/AnuncioDeRuta";
import { useLogout } from "@/modules/auth/hooks/useLogout";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";

/**
 * T3-04 — la barra de navegación, en un solo array y en su orden real.
 *
 * Antes eran cuatro arrays y el orden de la barra no estaba en ninguno: los dos enlaces
 * sueltos vivían juntos en `navLinks` y se separaban al pintarlos con `navLinks.slice(0, 1)`
 * y `navLinks.slice(1)` para colar los desplegables en medio. Añadir «Reportes» al final
 * exigía darse cuenta de que el índice 1 significaba «después de Órdenes».
 *
 * Ahora el array **es** el orden. Cada elemento dice de qué tipo es, y quien pinta decide
 * cómo, no cuándo.
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

type DesplegableDeNav = {
    kind: "dropdown";
    label: Clave;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    items: { to: string; label: Clave }[];
    /** Ancho del panel; lo fija el rótulo más largo de `items`. */
    width: string;
    /** Rutas que dejan el disparador marcado. Sin esto, el desplegable nunca se resalta. */
    activoEn?: (pathname: string) => boolean;
    soloAdmin?: boolean;
};

type ElementoDeNav = EnlaceDeNav | DesplegableDeNav;

const NAVEGACION: ElementoDeNav[] = [
    { kind: "link", to: "/", label: "ruta.dashboard", end: true, Icon: HomeIcon },
    {
        kind: "dropdown",
        label: "ruta.catalogo",
        Icon: Squares2X2Icon,
        width: "w-40",
        activoEn: (pathname) => pathname.startsWith("/catalog"),
        items: [
            { to: "/catalog/products", label: "ruta.productos" },
            { to: "/catalog/categories", label: "ruta.categorias" },
            { to: "/catalog/brands", label: "ruta.marcas" },
            { to: "/catalog/suppliers", label: "ruta.proveedores" },
            { to: "/catalog/tags", label: "ruta.etiquetas" },
        ],
    },
    {
        kind: "dropdown",
        label: "nav.ordenes",
        Icon: ClipboardDocumentListIcon,
        width: "w-36",
        activoEn: (pathname) => pathname === "/purchase-orders" || pathname === "/sale-orders",
        items: [
            { to: "/purchase-orders", label: "nav.compra" },
            { to: "/sale-orders", label: "nav.venta" },
        ],
    },
    { kind: "link", to: "/reports", label: "ruta.reportes", end: false, Icon: ChartBarIcon },
    {
        kind: "dropdown",
        label: "nav.admin",
        Icon: ShieldCheckIcon,
        width: "w-44",
        soloAdmin: true,
        items: [
            { to: "/admin/users", label: "ruta.usuarios" },
            { to: "/audit-logs", label: "nav.auditoria" },
            { to: "/settings", label: "ruta.configuracion" },
        ],
    },
];

/** Un desplegable de administración solo existe para quien lo es. */
const visibleDeNav = (elemento: ElementoDeNav, isAdmin: boolean) =>
    elemento.kind !== "dropdown" || !elemento.soloAdmin || isAdmin;

const esEnlace = (elemento: ElementoDeNav): elemento is EnlaceDeNav => elemento.kind === "link";
const esDesplegable = (elemento: ElementoDeNav): elemento is DesplegableDeNav => elemento.kind === "dropdown";

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

// Dashboard y Reportes son enlaces sueltos de la barra, no disparadores de menú, pero
// se delimitan igual que ellos: si no, en la misma fila conviven controles que muestran
// su caja y controles que no, y la barra se lee desigual.
const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        "flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:border-border focus-visible:outline-none",
        isActive
            // La sección en la que estás lleva su borde puesto, sin esperar al cursor.
            ? "border-info/30 bg-info-surface text-info"
            : "text-foreground-muted hover:border-border hover:bg-surface-muted",
    );

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        // Mismo trato que los ítems de los desplegables: la caja se delimita al tocarla.
        "flex min-h-11 items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
            ? "border-info/30 bg-info-surface text-info"
            : "text-foreground hover:border-border hover:bg-surface-muted",
    );

// Menú desplegable a pantalla completa para móvil. Lista todas las secciones
// de forma plana (con subtítulos), evitando la barra apretada que se producía
// al envolver los enlaces en un contenedor de altura fija.
function MobileMenu({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate: () => void }) {
    const { t } = useT();

    return (
        /*
         * **El menú se desplaza por dentro; la página, no.**
         *
         * Con doce entradas, el panel es más alto que la pantalla de un teléfono. Antes no
         * tenía altura máxima, así que al arrastrar sobre él lo que se movía era la página
         * de detrás —el menú se iba con ella y el contenido pasaba por debajo—, que es
         * justo lo que no debe hacer algo que está por encima.
         *
         * Tres piezas, y hacen falta las tres:
         *
         * - `max-h` restado a la altura de la barra (56 px) para que el panel quepa y sea
         *   él quien tenga desplazamiento propio. En **`dvh` y no `vh`**: en móvil la barra
         *   del navegador aparece y desaparece, y `vh` se queda con la ventana grande, así
         *   que las últimas entradas caen debajo del borde y no hay forma de llegar.
         * - `overscroll-contain` corta el *encadenamiento*: al llegar al final del panel, el
         *   gesto **no** continúa desplazando el documento.
         * - El bloqueo del `<body>` mientras está abierto, en el efecto de `App`. El
         *   encadenamiento no es el único camino: sin bloqueo, un gesto que empiece fuera
         *   del panel sigue moviendo la página detrás del menú.
         */
        <div className="lg:hidden max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain sin-barra border-t border-border bg-surface px-4 py-3 space-y-4">
            {/* T3-04: mismo array que el escritorio, agrupado por tipo en vez de por
                índice. El móvil no respeta el orden de la barra a propósito —los enlaces
                sueltos arriba y las secciones desplegadas debajo, con subtítulo—, y eso
                se lee ahora en el `filter`, que dice qué agrupa, no en un `slice`. */}
            <div className="space-y-1">
                {NAVEGACION.filter(esEnlace).map(({ to, label, end, Icon }) => (
                    <NavLink key={to} to={to} end={end} onClick={onNavigate} className={mobileLinkClass}>
                        <Icon className="h-4 w-4" />
                        {t(label)}
                    </NavLink>
                ))}
            </div>

            {NAVEGACION.filter(esDesplegable)
                .filter((elemento) => visibleDeNav(elemento, isAdmin))
                .map((elemento) => (
                    <MobileSection
                        key={elemento.label}
                        icon={elemento.Icon}
                        label={elemento.label}
                        links={elemento.items}
                        onNavigate={onNavigate}
                    />
                ))}
        </div>
    );
}

function MobileSection({
    icon: Icon,
    label,
    links,
    onNavigate,
}: {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    label: Clave;
    links: { to: string; label: Clave }[];
    onNavigate: () => void;
}) {
    const { t } = useT();

    return (
        <div>
            <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                <Icon className="h-3.5 w-3.5" />
                {t(label)}
            </p>
            <div className="space-y-1">
                {links.map(({ to, label: itemLabel }) => (
                    <NavLink key={to} to={to} onClick={onNavigate} className={mobileLinkClass}>
                        {t(itemLabel)}
                    </NavLink>
                ))}
            </div>
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
            <nav className="sticky top-0 z-40 border-b border-border bg-surface">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex h-14 items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                        {/* La marca va en el acento de la paleta, no en el informativo. */}
                        <CubeIcon className="h-5 w-5 text-accent" />
                        Stockly
                    </div>

                    {/* Navegación de escritorio: un solo recorrido, en el orden del array. */}
                    <div className="hidden lg:flex gap-1 flex-1 items-center">
                        {NAVEGACION.filter((elemento) => visibleDeNav(elemento, isAdmin)).map((elemento) =>
                            elemento.kind === "link" ? (
                                <NavLink key={elemento.to} to={elemento.to} end={elemento.end} className={desktopLinkClass}>
                                    <elemento.Icon className="h-3.5 w-3.5" />
                                    {t(elemento.label)}
                                </NavLink>
                            ) : (
                                <NavDropdown
                                    key={elemento.label}
                                    label={t(elemento.label)}
                                    Icon={elemento.Icon}
                                    // El panel recibe los rótulos ya traducidos: `NavDropdown`
                                    // es genérico y no tiene por qué saber del catálogo.
                                    items={elemento.items.map(({ to, label }) => ({ to, label: t(label) }))}
                                    isActive={elemento.activoEn?.(pathname) ?? false}
                                    width={elemento.width}
                                />
                            ),
                        )}
                    </div>

                    <div className="flex items-center gap-1 ml-auto lg:ml-0">
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
                    <div id="mobile-menu">
                        <MobileMenu isAdmin={isAdmin} onNavigate={closeMobile} />
                    </div>
                )}
            </nav>
            {/*
              `tabIndex={-1}` no lo mete en el orden de tabulación: lo hace
              enfocable *por programa*, que es lo que necesita el salto. Sin él, el
              navegador desplaza la página pero deja el foco donde estaba y la
              siguiente pulsación de Tab vuelve al principio de la navegación —el
              fallo clásico que hace inútil un enlace de salto.
            */}
            <main id="contenido" tabIndex={-1} className="outline-none">
                <Outlet />
            </main>
        </div>
    );
}

export default App;
