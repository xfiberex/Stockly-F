import { cn } from "@/shared/lib/cn";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    className?: string;
}

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Guarda el elemento con foco para restaurarlo al cerrar.
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
                return;
            }
            // Focus trap: mantiene el tabulador dentro del modal.
            if (e.key === "Tab" && panelRef.current) {
                const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKey);
        document.body.style.overflow = "hidden";

        // Mueve el foco al primer elemento enfocable dentro del modal.
        const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        (firstFocusable ?? panelRef.current)?.focus();

        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = "";
            previouslyFocused?.focus?.();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn("relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl outline-none", className)}
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="px-6 py-4">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
