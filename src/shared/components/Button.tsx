import { type ButtonHTMLAttributes } from "react";
import { clasesDeBoton, type VarianteBoton } from "@/shared/lib/clasesDeBoton";
import { Spinner } from "@/shared/components/Spinner";

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
            aria-busy={isLoading || undefined}
            className={clasesDeBoton(variant, className)}
            {...props}
        >
            {isLoading && <Spinner size="sm" decorativo className="border-current border-t-transparent" />}
            {children}
        </button>
    );
}
