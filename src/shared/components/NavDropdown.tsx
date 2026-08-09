import { useId, type ComponentType, type SVGProps } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { useMenuDesplegable } from "@/shared/hooks/useMenuDesplegable";

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
    // T2-16: aquí no había ningún atributo ARIA y el cierre con Escape faltaba tanto
    // en este menú como en `UserMenu`; los dos salen ahora del mismo hook.
    //
    // **Es un desplegable (`disclosure`), no un `menu`.** La ficha de la tarea pedía
    // replicar el `role="menu"` de `UserMenu`, y eso sería un error aquí: ese rol es
    // para comandos de aplicación, y lo que hay dentro son enlaces de navegación.
    // Ponerlo los convierte en `menuitem`, así que dejan de anunciarse como enlaces y
    // desaparecen de la lista de enlaces de un lector de pantalla —justo la herramienta
    // con la que se recorre un sitio—. Lo que sí hace falta es lo que faltaba: decir que
    // el botón abre algo, si está abierto, y poder salir con Escape.
    const { abierto: open, contenedor, disparador, alternar, cerrar } = useMenuDesplegable();
    const idMenu = useId();

    return (
        <div ref={contenedor} className="relative">
            <button
                ref={disparador}
                onClick={alternar}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? idMenu : undefined}
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
                    id={idMenu}
                    aria-label={label}
                    className={cn(
                        "absolute left-0 top-full mt-1.5 bg-surface rounded-xl border border-border shadow-lg py-1 z-50",
                        width,
                    )}
                >
                    {items.map(({ to, label: itemLabel }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={cerrar}
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
