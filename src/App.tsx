import { useState, useRef, useEffect } from "react";
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
import { NavDropdown } from "@/shared/components/NavDropdown";
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

function UserMenu({ name }: { name: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const logout = useLogout();

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-label="Menú de usuario"
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-muted transition-colors"
            >
                <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-surface text-xs font-semibold shrink-0">
                    {initials}
                </div>
                <span className="text-sm text-foreground font-medium hidden sm:block max-w-36 truncate">{name}</span>
                <ChevronDownIcon className={cn("h-3.5 w-3.5 text-foreground-muted transition-transform hidden sm:block", open && "rotate-180")} />
            </button>

            {open && (
                <div role="menu" className="absolute right-0 top-full mt-1.5 w-48 bg-surface rounded-xl border border-border shadow-lg py-1 z-50">
                    <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-foreground hover:bg-surface-muted transition-colors"
                    >
                        <UserCircleIcon className="h-4 w-4 text-foreground-muted" />
                        Mi perfil
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                        onClick={() => { setOpen(false); logout.mutate(); }}
                        role="menuitem"
                        disabled={logout.isPending}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-danger hover:bg-danger-surface transition-colors disabled:opacity-50"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        isActive ? "bg-info-surface text-info" : "text-foreground-muted hover:bg-surface-muted",
    );

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive ? "bg-info-surface text-info" : "text-foreground hover:bg-surface-muted",
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
                        {user && <UserMenu name={user.name} />}
                        {/* Botón hamburguesa — solo móvil/tablet */}
                        <button
                            onClick={toggleMobile}
                            aria-label={mobileOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
                            aria-expanded={mobileOpen}
                            aria-controls="mobile-menu"
                            className="lg:hidden rounded-lg p-2 text-foreground-muted hover:bg-surface-muted transition-colors"
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
            <main>
                <Outlet />
            </main>
        </div>
    );
}

export default App;
