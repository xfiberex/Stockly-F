import { cn } from "@/lib/cn";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

// Componente de modal reutilizable con soporte para título, contenido, cierre y estilos personalizados.
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    className?: string;
}

// Componente de modal que maneja la apertura, cierre y bloqueo de scroll, además de renderizar el contenido en un portal.
export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", handleKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={cn(
                    "relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl",
                    className
                )}
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-6 py-4">{children}</div>
            </div>
        </div>,
        document.body
    );
}