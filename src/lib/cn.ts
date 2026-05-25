import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Unir clases de Tailwind CSS de forma eficiente, evitando duplicados y conflictos.
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}