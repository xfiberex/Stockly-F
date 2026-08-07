import { cn } from "@/shared/lib/cn";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    placeholder?: string;
    options: { value: string; label: string }[];
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
                    <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
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
                            "w-full appearance-none rounded-lg border border-gray-300 pl-3 pr-9 py-2 text-sm text-gray-900 outline-none transition bg-white",
                            "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
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
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    />
                </div>
                {error && <p id={errorId} role="alert" className="text-xs text-red-500">{error}</p>}
            </div>
        );
    },
);

Select.displayName = "Select";
