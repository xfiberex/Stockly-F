import { cn } from "@/lib/cn";
import { type ButtonHTMLAttributes } from "react";

// Componente de botón reutilizable con variantes de estilo y estado de carga.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    isLoading?: boolean;
}

// Definición de estilos para cada variante de botón.
const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 disabled:text-gray-300",
};

// Componente de botón que acepta variantes, estado de carga y otras propiedades HTML estándar.
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
                className
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
