import { cn } from "@/lib/cn";

// Componente de spinner reutilizable con tamaños personalizables y estilos de animación.
interface SpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

// Definición de tamaños para el spinner, ajustando su altura y anchura según la opción seleccionada.
const sizes = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
};

// Componente de spinner que acepta un tamaño y otras propiedades HTML estándar.
export function Spinner({ size = "md", className }: SpinnerProps) {
    return (
        <div
            className={cn(
                "animate-spin rounded-full border-2 border-gray-200 border-t-blue-600",
                sizes[size],
                className
            )}
        />
    );
}
