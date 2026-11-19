import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";

/**
 * El «Reintentar» que va junto a la hora cuando una actualización falla. AUD-008, paso 8: era un
 * texto de 69×20 px que no decía nada mientras trabajaba. Ahora tiene el mínimo táctil, se marca
 * ocupado con su rueda y no se desactiva —desactivado soltaría el foco—.
 */
export function ReintentoEnLinea({ onReintentar, reintentando }: { onReintentar: () => void; reintentando: boolean }) {
    const { t } = useT();
    return (
        <button
            type="button"
            onClick={() => {
                if (!reintentando) onReintentar();
            }}
            aria-busy={reintentando || undefined}
            aria-disabled={reintentando || undefined}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg align-middle font-medium text-info hover:underline md:pointer-fine:min-h-0"
        >
            {reintentando && <Spinner size="sm" decorativo className="border-current border-t-transparent" />}
            {t("errorDeCarga.reintentar")}
        </button>
    );
}
