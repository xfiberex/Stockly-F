import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, Link, useMatch, useLocation } from "react-router-dom";
import {
    CubeIcon,
    UserCircleIcon,
    ChevronDownIcon,
    ArrowRightOnRectangleIcon,
    ShieldCheckIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    Squares2X2Icon,
    HomeIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
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

function CatalogMenu() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { pathname } = useLocation();
    const isActive = pathname.startsWith("/catalog");

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive || open ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                )}
            >
                <Squares2X2Icon className="h-3.5 w-3.5" />
                Catálogo
                <ChevronRightIcon className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {catalogLinks.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                cn(
                                    "block px-3.5 py-2 text-sm transition-colors",
                                    isActive ? "text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-50",
                                )
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}

function OrdersMenu() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const matchPurchase = useMatch("/purchase-orders");
    const matchSale = useMatch("/sale-orders");
    const isActive = !!(matchPurchase || matchSale);

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive || open ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                )}
            >
                <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
                Órdenes
                <ChevronRightIcon className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-36 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {orderLinks.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                cn(
                                    "block px-3.5 py-2 text-sm transition-colors",
                                    isActive ? "text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-50",
                                )
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}

function AdminMenu() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    open ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                )}
            >
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                Admin
                <ChevronRightIcon className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    {adminLinks.map(({ to, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                                cn(
                                    "block px-3.5 py-2 text-sm transition-colors",
                                    isActive ? "text-blue-700 bg-blue-50" : "text-gray-700 hover:bg-gray-50",
                                )
                            }
                        >
                            {label}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}

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
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            >
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {initials}
                </div>
                <span className="text-sm text-gray-700 font-medium hidden sm:block max-w-36 truncate">{name}</span>
                <ChevronDownIcon className={cn("h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block", open && "rotate-180")} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    <Link
                        to="/profile"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <UserCircleIcon className="h-4 w-4 text-gray-400" />
                        Mi perfil
                    </Link>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                        onClick={() => { setOpen(false); logout.mutate(); }}
                        disabled={logout.isPending}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        Cerrar sesión
                    </button>
                </div>
            )}
        </div>
    );
}

function App() {
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-6 flex h-14 items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                        <CubeIcon className="h-5 w-5 text-blue-600" />
                        Stockly
                    </div>
                    <div className="flex gap-1 flex-1 items-center flex-wrap">
                        {navLinks.slice(0, 1).map(({ to, label, end, Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                                    )
                                }
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </NavLink>
                        ))}
                        <CatalogMenu />
                        <OrdersMenu />
                        {navLinks.slice(1).map(({ to, label, end, Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    cn(
                                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                                    )
                                }
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </NavLink>
                        ))}
                        {isAdmin && <AdminMenu />}
                    </div>
                    {user && <UserMenu name={user.name} />}
                </div>
            </nav>
            <main>
                <Outlet />
            </main>
        </div>
    );
}

export default App;
