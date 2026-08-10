import { cn } from "@/shared/lib/cn";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    placeholder?: string;
    // `readonly` y `value: string`: el componente solo recorre la lista, así que exigir un
    // array mutable obligaba a quien tipa sus opciones contra un enum (T4-01) a copiarlo.
    options: ReadonlyArray<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, placeholder, options, className, id, ...props }, ref) => {
        // Ver `Input.tsx`: el id generado hace que la etiqueta rotule de verdad al
        // campo cuando quien lo usa no pasa `id`, y el error queda atado a él.
        const generatedId = useId();
        const fieldId = id ?? generatedId;
        const errorId = error ? `${fieldId}-error` : undefined;

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={fieldId}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={errorId}
                        className={cn(
                            // appearance-none oculta el indicador nativo (que se alinea distinto
                            // según el navegador); pr-9 deja sitio para el chevron propio.
                            // `min-h-11` hasta `md`: mínimo táctil (T2-40).
                            "w-full min-h-11 appearance-none rounded-lg border border-border pl-3 pr-9 py-2 text-sm text-foreground outline-none transition bg-surface md:min-h-9",
                            "focus:border-accent focus:ring-2 focus:ring-accent/20",
                            error && "border-danger focus:border-danger focus:ring-danger/20",
                            className,
                        )}
                        {...props}
                    >
                        {placeholder && <option value="">{placeholder}</option>}
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted"
                    />
                </div>
                {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
            </div>
        );
    },
);

Select.displayName = "Select";
