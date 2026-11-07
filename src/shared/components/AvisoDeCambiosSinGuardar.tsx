import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { Modal } from "@/shared/components/Modal";
import { useT } from "@/shared/hooks/useIdioma";

/**
 * AUD-011 — salir de una pantalla con algo sin guardar es una decisión de quien la usa, no un
 * accidente. Mientras `activo`:
 *
 * - **Navegar dentro de la aplicación** (menú, enlace, atrás) se para y se pregunta, con
 *   `useBlocker`. Solo cuenta cambiar de pantalla: un filtro que solo toca la `?búsqueda` no.
 * - **Recargar o cerrar la pestaña** saca el aviso del navegador (`beforeunload`), salvo con
 *   `avisarAlRecargar={false}`: lo que ya se guarda en la pestaña (`useEstadoDeSesion`) vuelve
 *   solo y no hace falta frenar a nadie.
 *
 * «Salir sin guardar» llama a `onDescartar` antes de irse: lo guardado en la pestaña se borra
 * también, o volver a la pantalla resucitaría lo que la persona acaba de tirar.
 */
export function AvisoDeCambiosSinGuardar({
    activo,
    mensaje,
    onDescartar,
    avisarAlRecargar = true,
}: {
    activo: boolean;
    mensaje: string;
    onDescartar?: () => void;
    avisarAlRecargar?: boolean;
}) {
    const { t } = useT();
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => activo && currentLocation.pathname !== nextLocation.pathname,
    );

    useEffect(() => {
        if (!activo || !avisarAlRecargar) return;
        const avisar = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Chrome antiguo y Safari solo enseñan el aviso con `returnValue` puesto.
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", avisar);
        return () => window.removeEventListener("beforeunload", avisar);
    }, [activo, avisarAlRecargar]);

    const bloqueado = blocker.state === "blocked";
    return (
        <Modal isOpen={bloqueado} onClose={() => blocker.reset?.()} title={t("sinGuardar.titulo")} className="max-w-md">
            <div className="space-y-4 text-sm text-foreground">
                <p>{mensaje}</p>
                {/* El que no pierde nada va antes en el orden del teclado —y arriba en el
                    móvil—: un Tab y Enter por inercia no tiran el trabajo. En escritorio se
                    invierte para que quede a la derecha, donde está la acción de cada diálogo. */}
                <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
                    <Button variant="secondary" onClick={() => blocker.reset?.()}>
                        {t("sinGuardar.quedarse")}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => {
                            onDescartar?.();
                            blocker.proceed?.();
                        }}
                    >
                        {t("sinGuardar.salir")}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
