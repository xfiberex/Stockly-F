import { useState } from "react";
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

const navLinks = [
    { to: "/", label: "Dashboard", end: true, Icon: HomeIcon },
    { to: "/reports", label: "Reportes", end: false, Icon: ChartBarIcon },
];

const catalogLinks = [
    { to: "/catalog/products", label: "Productos" },
    { to: "/catalog/categories", label: "Categorías" },
    { to: "/catalog/brands", label: "Marcas" },
    { to: "/catalog/suppliers", label: "Proveedores" },
    { to: "/catalog/tags", label: "Etiquetas" },
];

const orderLinks = [
    { to: "/purchase-orders", label: "Compra" },
    { to: "/sale-orders", label: "Venta" },
];

const adminLinks = [
    { to: "/admin/users", label: "Usuarios" },
    { to: "/audit-logs", label: "Auditoría" },
    { to: "/settings", label: "Configuración" },
];

function UserMenu({ name, email }: { name: string; email?: string }) {
    // T2-16: el cierre al pulsar fuera estaba duplicado con `NavDropdown` y ninguno de
    // los dos cerraba con Escape. Los dos usan ahora el mismo hook.
    const { abierto: open, contenedor, disparador, alternar, cerrar } = useMenuDesplegable();
    const logout = useLogout();

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
                aria-label="Menú de usuario"
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
                        Mi perfil
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
                        Cerrar sesión
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
    return (
        <div className="lg:hidden border-t border-border bg-surface px-4 py-3 space-y-4">
            <div className="space-y-1">
                {navLinks.map(({ to, label, end, Icon }) => (
                    <NavLink key={to} to={to} end={end} onClick={onNavigate} className={mobileLinkClass}>
                        <Icon className="h-4 w-4" />
                        {label}
                    </NavLink>
                ))}
            </div>

            <MobileSection icon={Squares2X2Icon} label="Catálogo" links={catalogLinks} onNavigate={onNavigate} />
            <MobileSection icon={ClipboardDocumentListIcon} label="Órdenes" links={orderLinks} onNavigate={onNavigate} />
            {isAdmin && <MobileSection icon={ShieldCheckIcon} label="Admin" links={adminLinks} onNavigate={onNavigate} />}
        </div>
    );
}

function MobileSection({
    icon: Icon,
    label,
    links,
    onNavigate,
}: {
    icon: typeof Squares2X2Icon;
    label: string;
    links: { to: string; label: string }[];
    onNavigate: () => void;
}) {
    return (
        <div>
            <p className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </p>
            <div className="space-y-1">
                {links.map(({ to, label: itemLabel }) => (
                    <NavLink key={to} to={to} onClick={onNavigate} className={mobileLinkClass}>
                        {itemLabel}
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

    const catalogActive = pathname.startsWith("/catalog");
    const ordersActive = pathname === "/purchase-orders" || pathname === "/sale-orders";

    // El menú se cierra solo al cambiar de ruta, sin sincronizarlo con un efecto:
    // se guarda la ruta en la que se abrió y el estado se deriva en render. Al
    // navegar, `openedAt` deja de coincidir con `pathname` y el menú desaparece,
    // venga la navegación de un enlace del propio menú o del historial del navegador.
    const [openedAt, setOpenedAt] = useState<string | null>(null);
    const mobileOpen = openedAt === pathname;

    const toggleMobile = () => setOpenedAt((actual) => (actual === pathname ? null : pathname));
    const closeMobile = () => setOpenedAt(null);

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
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
                Saltar al contenido principal
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

                    {/* Navegación de escritorio */}
                    <div className="hidden lg:flex gap-1 flex-1 items-center">
                        {navLinks.slice(0, 1).map(({ to, label, end, Icon }) => (
                            <NavLink key={to} to={to} end={end} className={desktopLinkClass}>
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </NavLink>
                        ))}
                        <NavDropdown label="Catálogo" Icon={Squares2X2Icon} items={catalogLinks} isActive={catalogActive} width="w-40" />
                        <NavDropdown label="Órdenes" Icon={ClipboardDocumentListIcon} items={orderLinks} isActive={ordersActive} width="w-36" />
                        {navLinks.slice(1).map(({ to, label, end, Icon }) => (
                            <NavLink key={to} to={to} end={end} className={desktopLinkClass}>
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </NavLink>
                        ))}
                        {isAdmin && <NavDropdown label="Admin" Icon={ShieldCheckIcon} items={adminLinks} width="w-44" />}
                    </div>

                    <div className="flex items-center gap-1 ml-auto lg:ml-0">
                        {user && <UserMenu name={user.name} email={user.email} />}
                        {/* Botón hamburguesa — solo móvil/tablet */}
                        <button
                            onClick={toggleMobile}
                            aria-label={mobileOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
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
