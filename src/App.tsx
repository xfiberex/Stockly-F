import { Outlet, NavLink, Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { useLogout } from "@/modules/auth/hooks/useLogout";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { Button } from "@/shared/components/Button";

const navLinks = [
    { to: "/", label: "Dashboard", end: true },
    { to: "/catalog", label: "Catálogo", end: false },
    { to: "/purchase-orders", label: "Órdenes de compra", end: false },
    { to: "/reports", label: "Reportes", end: false },
];

function App() {
    const { user } = useAuth();
    const logout = useLogout();

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white">
                <div className="max-w-7xl mx-auto px-6 flex h-14 items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                        <CubeIcon className="h-5 w-5 text-blue-600" />
                        Stockly
                    </div>
                    <div className="flex gap-1 flex-1">
                        {navLinks.map(({ to, label, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    cn(
                                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100",
                                    )
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        {user && (
                            <Link
                                to="/profile"
                                className="text-sm text-gray-600 hover:text-blue-600 hidden sm:block transition-colors"
                            >
                                {user.name}
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => logout.mutate()}
                            isLoading={logout.isPending}
                            className="text-sm"
                        >
                            Salir
                        </Button>
                    </div>
                </div>
            </nav>
            <main>
                <Outlet />
            </main>
        </div>
    );
}

export default App;
