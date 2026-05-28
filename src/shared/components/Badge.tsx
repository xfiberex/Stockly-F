import { cn } from "@/shared/lib/cn";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "default" | "success" | "danger" | "blue" | "purple" | "orange" | "teal";
    className?: string;
}

const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    teal: "bg-teal-100 text-teal-700",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
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
