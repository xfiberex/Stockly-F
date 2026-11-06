import axios from "axios";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import type { Idioma } from "@/shared/i18n/idioma";
import { traducir } from "@/shared/i18n/traducir";
import { mensajeDeError } from "@/shared/lib/errorApi";
import { cn } from "@/shared/lib/cn";

/**
 * AUD-008, crítica del 2026-11-06 — por qué no cargó, dicho para quien usa la pantalla. Un
 * fallo del servidor (5xx) o una ruta que no existe (404) no es algo que el usuario pueda
 * arreglar, y su texto era técnico: el aviso llegó a leer en voz alta «Ruta no encontrada:
 * GET /api/v1/…». El resto —sin conexión, sin permiso— sí dice algo útil y se queda.
 */
function motivoDeFallo(idioma: Idioma, error: unknown): string {
    const estado = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (estado !== undefined && (estado >= 500 || estado === 404)) return traducir(idioma, "errorDeCarga.servidor");
    return mensajeDeError(idioma, error);
}

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
                <p className="text-sm text-foreground-muted">{motivoDeFallo(idioma, error)}</p>
            </div>
            {/* AUD-008, paso 8: mientras reintenta no se desactiva (`isLoading` lo haría): un
                botón desactivado con el foco dentro lo suelta en `<body>`, y quien usa teclado o
                lector tenía que volver a recorrer la página. Se marca ocupado y no repite. */}
            <Button
                variant="secondary"
                onClick={() => {
                    if (!reintentando) onReintentar();
                }}
                aria-busy={reintentando || undefined}
                aria-disabled={reintentando || undefined}
                className="shrink-0"
            >
                {reintentando ? (
                    <Spinner size="sm" decorativo className="border-current border-t-transparent" />
                ) : (
                    <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {t("errorDeCarga.reintentar")}
            </Button>
        </div>
    );
}
