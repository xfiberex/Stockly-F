import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { clasesDeItemDeMenu, CLASES_PANEL_DE_MENU } from "@/shared/lib/clasesDeItemDeMenu";

export interface DropdownItem {
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
}

interface DropdownButtonProps {
    label: string;
    items: DropdownItem[];
    variant?: "primary" | "secondary" | "ghost";
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
}

const variants = {
    primary: "bg-primary text-surface hover:bg-primary disabled:bg-primary/40",
    secondary: "bg-surface-muted text-foreground hover:bg-border disabled:bg-surface-muted",
    ghost: "bg-transparent text-foreground-muted hover:bg-surface-muted disabled:text-border",
};

export function DropdownButton({
    label,
    items,
    variant = "secondary",
    icon: Icon,
    disabled = false,
}: DropdownButtonProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={open}
                className={cn(
                    // Misma densidad que `Button` (T2-40): 44 px al pulgar, 36 al ratón.
                    "inline-flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed md:min-h-9",
                    // `w-full` para que el disparador ocupe lo que le den. En el encabezado
                    // de una página, en móvil, las acciones se estiran a media fila cada una
                    // (ver `clasesDeEncabezado.ts`) y sin esto el desplegable se quedaba
                    // encogido al lado de un botón ancho. En escritorio su contenedor mide lo
                    // que el contenido, así que `w-full` no cambia nada.
                    "w-full justify-center sm:justify-start",
                    "hover:border-border focus-visible:border-border focus-visible:outline-none",
                    variants[variant],
                    open && "border-border",
                )}
            >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
                <ChevronDownIcon
                    className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className={cn(
                        // **En móvil se ancla a la izquierda del disparador, no a la derecha.**
                        // Medido a 412 px: con `right-0` y un ancho fijo de 176 px, el panel de
                        // «Exportar» —que en el encabezado empieza cerca del margen izquierdo—
                        // se dibujaba en `left: -13px`, con la primera letra de cada opción
                        // fuera de la pantalla. Anclado a la izquierda crece hacia el centro,
                        // que es donde hay sitio. En escritorio estos botones viven a la
                        // derecha del encabezado y el anclaje bueno es el contrario.
                        "absolute left-0 right-auto z-20 mt-1 w-44 max-w-[calc(100vw-2rem)] sm:left-auto sm:right-0",
                        CLASES_PANEL_DE_MENU,
                    )}
                >
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                item.onClick();
                                setOpen(false);
                            }}
                            className={clasesDeItemDeMenu("text-foreground")}
                        >
                            {item.icon && <item.icon className="h-4 w-4 text-foreground-muted" />}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
