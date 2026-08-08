import { cn } from "@/shared/lib/cn";
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    isLoading?: boolean;
}

// Tokens semánticos (T2-35), no valores. `--color-primary` es el color de acción
// primaria de la paleta; los rellenos con texto blanco encima usan siempre la
// variante fuerte de cada color, nunca el acento suave, que no llega a AA.
const variants = {
    primary: "bg-primary text-surface hover:bg-foreground disabled:bg-primary/40",
    secondary: "bg-surface-muted text-foreground hover:bg-border disabled:text-foreground-muted/50",
    danger: "bg-danger text-surface hover:bg-danger/90 disabled:bg-danger/40",
    ghost: "bg-transparent text-foreground-muted hover:bg-surface-muted disabled:text-foreground-muted/40",
};

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
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
                variants[variant],
                className,
            )}
            {...props}
        >
            {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {children}
        </button>
    );
}
