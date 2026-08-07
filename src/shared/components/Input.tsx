import { cn } from "@/shared/lib/cn";
import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, id, ...props }, ref) => {
        // Sin `id` explícito, `htmlFor` quedaba vacío y la etiqueta no se asociaba a
        // nada: el campo se veía rotulado pero no tenía nombre accesible. El id
        // generado cubre a quien no lo pasa (los ítems de las órdenes, por ejemplo).
        const generatedId = useId();
        const fieldId = id ?? generatedId;

        // El color del borde es el único indicador visual del error, y no llega a
        // quien no lo ve. `aria-invalid` marca el campo como inválido y
        // `aria-describedby` ata el mensaje al campo, para que el lector de pantalla
        // lo anuncie al enfocarlo; `role="alert"` lo hace además al aparecer.
        const errorId = error ? `${fieldId}-error` : undefined;

        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={fieldId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={errorId}
                    className={cn(
                        "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition",
                        "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        className,
                    )}
                    {...props}
                />
                {error && <p id={errorId} role="alert" className="text-xs text-red-500">{error}</p>}
            </div>
        );
    },
);

Input.displayName = "Input";
