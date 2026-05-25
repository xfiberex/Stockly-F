import { cn } from "@/lib/cn";
import { forwardRef, type SelectHTMLAttributes } from "react";

// Componente de selección reutilizable con soporte para etiquetas, errores, opciones y estilos personalizados.
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    placeholder?: string;
    options: { value: string; label: string }[];
}

// Componente de selección que acepta una etiqueta, mensaje de error, opciones y otras propiedades HTML estándar.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, placeholder, options, className, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={id}
                    className={cn(
                        "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition bg-white",
                        "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        className
                    )}
                    {...props}
                >
                    {placeholder && (
                        <option value="">{placeholder}</option>
                    )}
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Select.displayName = "Select";