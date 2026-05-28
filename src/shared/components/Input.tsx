import { cn } from "@/shared/lib/cn";
import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, id, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1">
                {label && (
                    <label htmlFor={id} className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={id}
                    className={cn(
                        "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition",
                        "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                        error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
                        className,
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        );
    },
);

Input.displayName = "Input";
