import type { ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";

/**
 * El conmutador de una fila que se despliega (AUD-018).
 *
 * Las filas de Compras y Ventas se abrían con un `onClick` en el `div` de la cabecera: con
 * el ratón, bien; con el teclado no había forma de llegar, y el lector de pantalla no sabía
 * que aquello se desplegaba. La cabecera entera no puede ser el botón, porque lleva dentro
 * otros controles —el enlace al cliente, recibir, cancelar— y un botón no admite controles
 * dentro. Así que el botón es **el número de la orden**, que es lo que la nombra, con su
 * `aria-expanded` y un chevron que dice lo mismo a la vista.
 *
 * El `div` sigue respondiendo al clic, para no encoger la diana de quien usa el ratón o el
 * dedo. Por eso el botón corta la propagación: sin eso, pulsarlo alternaría dos veces y la
 * fila se quedaría como estaba.
 */
export function BotonDeDesplegar({
    abierto,
    onAlternar,
    children,
}: {
    abierto: boolean;
    onAlternar: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-expanded={abierto}
            onClick={(e) => {
                e.stopPropagation();
                onAlternar();
            }}
            className="inline-flex items-center gap-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
            {children}
            <ChevronDownIcon
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0 text-foreground-muted transition-transform", abierto && "rotate-180")}
            />
        </button>
    );
}
