import { useState, useRef, useEffect, type ComponentType, type SVGProps } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";

export interface NavDropdownItem {
    to: string;
    label: string;
}

interface NavDropdownProps {
    label: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    items: NavDropdownItem[];
    /** Resalta el botón cuando la ruta activa pertenece a este menú. */
    isActive?: boolean;
    width?: string;
}

// Botón de navegación con menú desplegable. Unifica los antiguos
// CatalogMenu / OrdersMenu / AdminMenu, que compartían toda la lógica.
export function NavDropdown({ label, Icon, items, isActive = false, width = "w-44" }: NavDropdownProps) {
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
                    isActive || open ? "bg-info-surface text-info" : "text-foreground-muted hover:bg-surface-muted",
                )}
            >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <ChevronRightIcon className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
            </button>
            {open && (
                <div
                    className={cn(
                        "absolute left-0 top-full mt-1.5 bg-surface rounded-xl border border-border shadow-lg py-1 z-50",
                        width,
                    )}
                >
                    {items.map(({ to, label: itemLabel }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setOpen(false)}
                            className={({ isActive: linkActive }) =>
                                cn(
                                    "block px-3.5 py-2 text-sm transition-colors",
                                    linkActive ? "text-info bg-info-surface" : "text-foreground hover:bg-surface-muted",
                                )
                            }
                        >
                            {itemLabel}
                        </NavLink>
                    ))}
                </div>
            )}
        </div>
    );
}
