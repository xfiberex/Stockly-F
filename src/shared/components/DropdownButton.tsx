import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";

export interface DropdownItem {
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
}

interface DropdownButtonProps {
    label: string;
    items: DropdownItem[];
    variant?: "primary" | "secondary" | "ghost";
    icon?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
}

const variants = {
    primary: "bg-primary text-surface hover:bg-primary disabled:bg-primary/40",
    secondary: "bg-surface-muted text-foreground hover:bg-border disabled:bg-surface-muted",
    ghost: "bg-transparent text-foreground-muted hover:bg-surface-muted disabled:text-border",
};

export function DropdownButton({
    label,
    items,
    variant = "secondary",
    icon: Icon,
    disabled = false,
}: DropdownButtonProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={open}
                className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
                    variants[variant],
                )}
            >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
                <ChevronDownIcon
                    className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")}
                />
            </button>

            {open && (
                <div
                    role="menu"
                    className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg"
                >
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                item.onClick();
                                setOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-foreground hover:bg-surface-muted transition-colors"
                        >
                            {item.icon && <item.icon className="h-4 w-4 text-foreground-muted" />}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
