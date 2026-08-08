import { cn } from "@/shared/lib/cn";

/**
 * Cinco variantes, todas con significado (T2-36).
 *
 * Antes eran siete y mezclaban semántica (`success`, `danger`) con decoración
 * (`blue`, `purple`, `orange`, `teal`); `purple` y `teal` se usaban una sola vez
 * en toda la aplicación, así que el color no comunicaba nada estable. Ahora cada
 * variante es un par `--color-<estado>-surface` / `--color-<estado>` de la paleta,
 * con el contraste comprobado en `theme.test.ts`.
 */
export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variants: Record<BadgeVariant, string> = {
    neutral: "bg-surface-muted text-foreground-muted",
    success: "bg-success-surface text-success",
    warning: "bg-warning-surface text-warning",
    danger: "bg-danger-surface text-danger",
    info: "bg-info-surface text-info",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                variants[variant],
                className,
            )}
        >
            {children}
        </span>
    );
}
