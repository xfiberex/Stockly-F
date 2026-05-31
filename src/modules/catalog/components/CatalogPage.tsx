import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/shared/lib/cn";

const tabs = [
    { to: "/catalog/products", label: "Productos" },
    { to: "/catalog/categories", label: "Categorías" },
    { to: "/catalog/brands", label: "Marcas" },
    { to: "/catalog/suppliers", label: "Proveedores" },
];

export default function CatalogPage() {
    return (
        <div>
            {/* Sub-navegación del catálogo — sticky debajo del navbar principal (h-14) */}
            <div className="sticky top-14 z-30 bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex">
                        {tabs.map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    cn(
                                        "px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                                        isActive
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                                    )
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </div>

            {/* Contenido de la sub-ruta activa */}
            <Outlet />
        </div>
    );
}
