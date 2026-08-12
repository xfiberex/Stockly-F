import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { useT } from "@/shared/hooks/useIdioma";

interface CampoDeFechaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
    error?: string;
}

/**
 * Un campo de fecha que se ve igual en todos los navegadores.
 *
 * **El motivo es el mismo que llevó a `Select` a poner `appearance-none`:** el adorno
 * nativo se alinea distinto en cada navegador. Con las fechas es peor, porque además
 * cambia de forma. Reportado desde un Android real: los dos filtros de movimientos salían
 * **vacíos y con el indicador descolocado**, dibujado como un chevron de desplegable en
 * vez de un calendario, sin parecerse ni al `Select` de encima ni a lo que se ve en
 * escritorio.
 *
 * Tres decisiones, y las tres se pagan solas:
 *
 * 1. **`appearance-none` y el icono lo pintamos nosotros**, igual que en `Select`. Deja de
 *    depender de qué dibuje el navegador de turno.
 * 2. **Una pista cuando está vacío.** `input[type=date]` **no admite `placeholder`** —el
 *    atributo se ignora—, y en Android un campo sin valor se pinta en blanco: no hay forma
 *    de saber que es una fecha si no fuera por la etiqueta. La pista sale del catálogo,
 *    porque el formato depende del idioma (`dd/mm/aaaa` frente a `mm/dd/yyyy`).
 * 3. **Toda la caja abre el calendario**, no solo el icono: en `index.css`, el indicador
 *    nativo se estira invisible sobre el campo entero. Un objetivo táctil de 16 px en la
 *    esquina es exactamente lo que el mínimo de 44 px del sistema de diseño quiere evitar.
 */
export const CampoDeFecha = forwardRef<HTMLInputElement, CampoDeFechaProps>(
    ({ label, error, className, id, value, ...props }, ref) => {
        const { t } = useT();
        const generado = useId();
        const idCampo = id ?? generado;
        const idError = error ? `${idCampo}-error` : undefined;
        const vacio = !value;

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={idCampo} className="text-xs text-foreground-muted">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        ref={ref}
                        id={idCampo}
                        type="date"
                        value={value}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={idError}
                        className={cn(
                            "campo-de-fecha w-full min-h-11 appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 py-2 text-sm text-foreground outline-none transition md:min-h-9",
                            "focus:border-accent focus:ring-2 focus:ring-accent/20",
                            // Sin esto salían **dos** pistas superpuestas y el campo era
                            // ilegible: Chrome de escritorio dibuja su propio «dd/mm/aaaa»
                            // cuando el campo está vacío —Android no, que es de donde venía
                            // el aviso— y encima caía la nuestra. Se apaga el texto nativo
                            // en vez de renunciar a la pista, porque el navegador que no la
                            // pinta es justo el del teléfono.
                            vacio && "text-transparent",
                            error && "border-danger focus:border-danger focus:ring-danger/20",
                            className,
                        )}
                        {...props}
                    />
                    {vacio && (
                        // `aria-hidden`: para un lector de pantalla el campo ya se anuncia
                        // como fecha y con su etiqueta; esto es una pista visual y repetirla
                        // solo añade ruido. `pointer-events-none` deja pasar el toque al
                        // campo de debajo, que es quien abre el calendario.
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted"
                        >
                            {t("comun.formatoFecha")}
                        </span>
                    )}
                    <CalendarDaysIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted"
                    />
                </div>
                {error && <p id={idError} role="alert" className="text-xs text-danger">{error}</p>}
            </div>
        );
    },
);

CampoDeFecha.displayName = "CampoDeFecha";
