import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { CubeIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { CLASES_MARCO_CENTRADO } from "@/shared/lib/clasesDeMarco";

/**
 * AUD-014 — el marco de las seis pantallas sin sesión: la marca, el `h1` y la tarjeta. Antes la
 * marca solo estaba en el login, y dos estados (restablecer y confirmar sin enlace válido) se
 * pintaban como una línea roja suelta, sin `h1` ni salida.
 */
export function MarcoDeAcceso({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: ReactNode }) {
    return (
        <main className={CLASES_MARCO_CENTRADO}>
            <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-surface p-8 shadow-raised">
                <div className="text-center">
                    <div className="mb-4 flex items-center justify-center gap-2">
                        <div className="rounded-xl bg-primary p-2">
                            <CubeIcon aria-hidden="true" className="h-6 w-6 text-surface" />
                        </div>
                        {/* El nombre del producto no se traduce. */}
                        <span className="text-2xl font-bold text-foreground">Stockly</span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground">{titulo}</h1>
                    {subtitulo && <p className="mt-1 text-sm text-foreground-muted">{subtitulo}</p>}
                </div>
                {children}
            </div>
        </main>
    );
}

/**
 * AUD-014 — lo que dice el servidor, dentro de la tarjeta y hasta que se vuelve a intentar.
 * Antes salía solo en un aviso de 3 s en una esquina: «credenciales inválidas» o «pendiente de
 * aprobación» desaparecían antes de leerlos (WCAG 2.2.1), lejos del formulario.
 */
export function AvisoDeAcceso({ children }: { children: ReactNode }) {
    return (
        <div role="alert" className="flex gap-2 rounded-lg border border-danger/30 bg-danger-surface p-3 text-sm text-foreground">
            <ExclamationTriangleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <div>{children}</div>
        </div>
    );
}

interface CampoDeContrasenaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label: string;
    error?: string;
    /** Lo que tiene que cumplir, siempre a la vista (antes vivía en el placeholder y se borraba al escribir). */
    ayuda?: string;
}

/**
 * AUD-014 — una contraseña con «Mostrar» y su requisito fijo debajo. El botón no cambia el
 * nombre del campo: lo que alterna es `aria-pressed`.
 */
export const CampoDeContrasena = forwardRef<HTMLInputElement, CampoDeContrasenaProps>(
    ({ label, error, ayuda, id, className, ...props }, ref) => {
        const { t } = useT();
        const [visible, setVisible] = useState(false);
        const generado = useId();
        const campoId = id ?? generado;
        const ayudaId = ayuda ? `${campoId}-ayuda` : undefined;
        const errorId = error ? `${campoId}-error` : undefined;

        return (
            <div className="flex flex-col gap-1">
                <label htmlFor={campoId} className="text-sm font-medium text-foreground">{label}</label>
                <div className="relative">
                    <input
                        ref={ref}
                        id={campoId}
                        type={visible ? "text" : "password"}
                        aria-invalid={error ? true : undefined}
                        aria-describedby={cn(ayudaId, errorId) || undefined}
                        className={cn(
                            "min-h-11 w-full rounded-lg border border-border py-2 pl-3 pr-12 text-sm text-foreground placeholder-foreground-muted outline-none transition md:pointer-fine:min-h-9",
                            "focus:border-accent focus:ring-2 focus:ring-accent/20",
                            error && "border-danger focus:border-danger focus:ring-danger/20",
                            className,
                        )}
                        {...props}
                    />
                    <button
                        type="button"
                        aria-pressed={visible}
                        aria-controls={campoId}
                        aria-label={t("auth.mostrarContrasena")}
                        onClick={() => setVisible((v) => !v)}
                        className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-lg text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
                    >
                        {visible ? <EyeSlashIcon aria-hidden="true" className="h-5 w-5" /> : <EyeIcon aria-hidden="true" className="h-5 w-5" />}
                    </button>
                </div>
                {ayuda && <p id={ayudaId} className="text-xs text-foreground-muted">{ayuda}</p>}
                {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
            </div>
        );
    },
);

CampoDeContrasena.displayName = "CampoDeContrasena";
