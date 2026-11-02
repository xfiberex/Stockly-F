import { cn } from "@/shared/lib/cn";
import { useT } from "@/shared/hooks/useIdioma";

interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
    /**
     * Lo anuncia otro: el botón que lo lleva ya dice que está ocupado (`aria-busy`). Sin esto,
     * cada spinner es una región `status` con su «Cargando…».
     */
    decorativo?: boolean;
}

const sizes = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
};

/**
 * Para lo que no tiene forma que anticipar —una ruta que se descarga, la sesión que se
 * comprueba— o es pequeño: un botón, un desplegable. Una lista o una tabla que cargan van con
 * `Esqueleto` (design-system.md §8).
 *
 * Un `span` y no un `div`, porque vive también dentro de `<button>`.
 */
export function Spinner({ size = "md", className, decorativo = false }: SpinnerProps) {
    const { t } = useT();
    const rueda = (
        <span
            aria-hidden="true"
            className={cn(
                "block animate-spin rounded-full border-2 border-border border-t-blue-600",
                sizes[size],
                className,
            )}
        />
    );
    if (decorativo) return rueda;

    return (
        <span role="status" className="inline-flex">
            {rueda}
            <span className="sr-only">{t("comun.cargando")}</span>
        </span>
    );
}
