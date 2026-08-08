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
                    <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={fieldId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={errorId}
                    className={cn(
                        "rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none transition",
                        "focus:border-accent focus:ring-2 focus:ring-accent/20",
                        error && "border-danger focus:border-danger focus:ring-danger/20",
                        className,
                    )}
                    {...props}
                />
                {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
            </div>
        );
    },
);

Input.displayName = "Input";
