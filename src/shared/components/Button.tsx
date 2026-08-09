import { type ButtonHTMLAttributes } from "react";
import { clasesDeBoton, type VarianteBoton } from "@/shared/lib/clasesDeBoton";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: VarianteBoton;
    isLoading?: boolean;
}

export function Button({
    variant = "primary",
    isLoading = false,
    disabled,
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || isLoading}
            className={clasesDeBoton(variant, className)}
            {...props}
        >
            {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {children}
        </button>
    );
}
