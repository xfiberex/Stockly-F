import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { CheckCircleIcon, CubeIcon, ExclamationTriangleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useIdioma, useT } from "@/shared/hooks/useIdioma";
import type { Idioma } from "@/shared/i18n/idioma";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_SUELTO, CLASES_MARCO_CENTRADO } from "@/shared/lib/clasesDeMarco";

/**
 * AUD-014 — el marco de las seis pantallas sin sesión: la marca, el `h1` y la tarjeta. Antes la
 * marca solo estaba en el login, y dos estados (restablecer y confirmar sin enlace válido) se
 * pintaban como una línea roja suelta, sin `h1` ni salida.
 */
export function MarcoDeAcceso({
    titulo,
    subtitulo,
    enfocarTitulo = false,
    children,
}: {
    titulo: string;
    subtitulo?: string;
    /** Lleva el foco al `h1` al montarse: la pantalla cambió de golpe a un estado que hay que leer. */
    enfocarTitulo?: boolean;
    children: ReactNode;
}) {
    const h1 = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        if (enfocarTitulo) h1.current?.focus();
    }, [enfocarTitulo]);

    return (
        <main className={CLASES_MARCO_CENTRADO}>
            <div className="w-full max-w-sm space-y-3">
                {/* `p-6` en el móvil: con `p-8` dentro de `px-4`, los campos se quedaban en 292 de 390 px. */}
                <div className="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-raised sm:p-8">
                    <div className="text-center">
                        <div className="mb-4 flex items-center justify-center gap-2">
                            <div className="rounded-xl bg-primary p-2">
                                <CubeIcon aria-hidden="true" className="h-6 w-6 text-surface" />
                            </div>
                            {/* El nombre del producto no se traduce. */}
                            <span className="text-2xl font-bold text-foreground">Stockly</span>
                        </div>
                        <h1 ref={h1} tabIndex={enfocarTitulo ? -1 : undefined} className="text-xl font-bold text-foreground outline-none">{titulo}</h1>
                        {subtitulo && <p className="mt-1 text-sm text-foreground-muted">{subtitulo}</p>}
                    </div>
                    {children}
                </div>
                <IdiomaSinSesion />
            </div>
        </main>
    );
}

/** Los dos idiomas, cada uno escrito en el suyo: quien no entiende el de la pantalla reconoce el propio. */
const IDIOMAS: { valor: Idioma; nombre: string }[] = [
    { valor: "es", nombre: "Español" },
    { valor: "en", nombre: "English" },
];

/**
 * AUD-016 (pendiente de `AUD-014`) — el idioma, antes de entrar. Sin sesión no había dónde
 * elegirlo: valía el del navegador, y quien lo tuviera en otro idioma tenía que entrar sin
 * entender el formulario para cambiarlo en el Perfil. Fuera de la tarjeta y discreto: no es
 * parte del formulario. Se guarda en este navegador, como el del Perfil.
 */
function IdiomaSinSesion() {
    const { idioma, cambiarIdioma } = useIdioma();
    const { t } = useT();
    return (
        <div role="group" aria-label={t("apariencia.idioma.titulo")} className="flex justify-center gap-4 text-sm">
            {IDIOMAS.map(({ valor, nombre }) => (
                <button
                    key={valor}
                    type="button"
                    lang={valor}
                    aria-pressed={idioma === valor}
                    onClick={() => cambiarIdioma(valor)}
                    className={cn(
                        CLASES_ENLACE_SUELTO,
                        "rounded px-1 focus-visible:outline-2 focus-visible:outline-info",
                        idioma === valor ? "font-semibold text-foreground" : "text-foreground-muted hover:text-foreground hover:underline",
                    )}
                >
                    {nombre}
                </button>
            ))}
        </div>
    );
}

/**
 * AUD-014 — lo que dice el servidor, dentro de la tarjeta y hasta que se vuelve a intentar.
 * Antes salía solo en un aviso de 3 s en una esquina: «credenciales inválidas» o «pendiente de
 * aprobación» desaparecían antes de leerlos (WCAG 2.2.1), lejos del formulario.
 */
export function AvisoDeAcceso({ children, tono = "error" }: { children: ReactNode; tono?: "error" | "exito" }) {
    // El de éxito (la contraseña nueva, ya guardada) es `status`: se anuncia sin interrumpir.
    return tono === "exito" ? (
        <div role="status" className="flex gap-2 rounded-lg border border-success/30 bg-success-surface p-3 text-sm text-foreground">
            <CheckCircleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <div className="text-pretty">{children}</div>
        </div>
    ) : (
        <div role="alert" className="flex gap-2 rounded-lg border border-danger/30 bg-danger-surface p-3 text-sm text-foreground">
            <ExclamationTriangleIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            {/* `text-pretty`: «correctos» se quedaba sola en la segunda línea. */}
            <div className="text-pretty">{children}</div>
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
        // Cuando el error repite la ayuda («Mínimo 8 caracteres»), un solo texto: salía dos veces.
        // Si dice otra cosa («La contraseña es obligatoria»), el requisito sigue a la vista.
        const ayudaId = ayuda && ayuda !== error ? `${campoId}-ayuda` : undefined;
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
                        // Con el nombre del campo: en el registro hay dos, y los dos se llamaban igual.
                        aria-label={t("auth.mostrarContrasena", { campo: label })}
                        onClick={() => setVisible((v) => !v)}
                        className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-lg text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
                    >
                        {visible ? <EyeSlashIcon aria-hidden="true" className="h-5 w-5" /> : <EyeIcon aria-hidden="true" className="h-5 w-5" />}
                    </button>
                </div>
                {ayudaId && <p id={ayudaId} className="text-xs text-foreground-muted">{ayuda}</p>}
                {/* Sin `role="alert"`: el formulario lleva el foco al primer campo con error, que lo lee
                    por `aria-describedby`. Con él, enviar vacío disparaba una alerta por campo. */}
                {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
            </div>
        );
    },
);

CampoDeContrasena.displayName = "CampoDeContrasena";
