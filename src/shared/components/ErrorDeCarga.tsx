import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { cn } from "@/shared/lib/cn";

/**
 * Lo que se pinta cuando una consulta falla y no hay nada que enseñar. Dice qué no se cargó,
 * por qué —el motivo del servidor traducido, o «sin conexión»— y deja reintentar sin recargar.
 *
 * Antes, una consulta fallida dejaba el esqueleto de carga para siempre: la pantalla parecía
 * lenta, no rota, y nadie sabía que tenía que recargar.
 *
 * `role="alert"`: el fallo llega después de que la pantalla ya se anunció, y un lector de
 * pantalla tiene que enterarse sin ir a buscarlo.
 */
export function ErrorDeCarga({
    titulo,
    error,
    onReintentar,
    reintentando = false,
    className,
}: {
    titulo: string;
    error: unknown;
    onReintentar: () => void;
    reintentando?: boolean;
    className?: string;
}) {
    const { t, idioma } = useT();

    return (
        <div role="alert" className={cn("flex flex-col items-start gap-3 sm:flex-row sm:items-center", className)}>
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-danger" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{titulo}</p>
                <p className="text-sm text-foreground-muted">{mensajeDeError(idioma, error)}</p>
            </div>
            <Button variant="secondary" onClick={onReintentar} isLoading={reintentando} className="shrink-0">
                {!reintentando && <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />}
                {t("errorDeCarga.reintentar")}
            </Button>
        </div>
    );
}
