import { cn } from "@/shared/lib/cn";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    className?: string;
}

/**
 * T5-08 — los modales abiertos, del de abajo al de arriba. El escáner se abre **encima** del
 * formulario de producto, y sin esto Escape los cerraba los dos —cada uno escucha en
 * `document`— y cerrar el de arriba devolvía el scroll a la página con el de abajo aún abierto.
 * Solo el de arriba atiende al teclado, y el scroll se libera al cerrar el último.
 */
const abiertos: symbol[] = [];

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    const { t } = useT();
    const titleId = useId();
    const panelRef = useRef<HTMLDivElement>(null);

    // T5-14 — `onClose` se guarda en una referencia y **no es dependencia del efecto de abajo**.
    // Casi todos los formularios lo pasan como una función nueva en cada pintado, y con él en
    // las dependencias el efecto se rehacía entero —devolver el foco, volver a ponerlo en el
    // primer campo— cada vez que el padre se repintaba. No se notaba porque, con el diálogo
    // abierto, el padre casi nunca se repintaba solo; desde que los formularios leen los
    // almacenes, la respuesta llega un instante después de abrir y el foco saltaba al primer
    // campo con el usuario ya escribiendo en otro.
    const cerrar = useRef(onClose);
    useEffect(() => {
        cerrar.current = onClose;
    });

    useEffect(() => {
        if (!isOpen) return;

        // Guarda el elemento con foco para restaurarlo al cerrar.
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const propio = Symbol();
        abiertos.push(propio);

        const handleKey = (e: KeyboardEvent) => {
            if (abiertos.at(-1) !== propio) return;
            if (e.key === "Escape") {
                cerrar.current();
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
            abiertos.splice(abiertos.indexOf(propio), 1);
            if (abiertos.length === 0) document.body.style.overflow = "";
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

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
                // `max-h` + scroll propio: sin esto, un formulario más alto que la
                // ventana desborda el panel y sus botones quedan fuera de pantalla,
                // inalcanzables (el body está bloqueado mientras el modal está abierto).
                className={cn(
                    "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-surface shadow-overlay outline-none",
                    className,
                )}
            >
                {/* `px-4` hasta `sm`, como el contenedor de página: el relleno de escritorio
                    se come 48 de los 412 px de un teléfono, y aquí se los quita a un panel
                    que ya solo mide 380. */}
                <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4 sm:px-6">
                    <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label={t("comun.cerrar")}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground-muted transition-colors md:min-h-0 md:min-w-0"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
