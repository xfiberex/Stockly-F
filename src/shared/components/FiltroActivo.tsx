import { XMarkIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";

/**
 * AUD-008, paso 9 — un filtro que llegó en la URL desde el panel y que la barra de filtros de
 * la lista no tiene («por recibir», «stock bajo», «sin coste», «las mías»). Dice cuál es, para
 * que la lista no parezca incompleta, y se quita con un toque.
 */
export function FiltroActivo({ texto, onQuitar }: { texto: string; onQuitar: () => void }) {
    const { t } = useT();
    return (
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-foreground">
            <span>{texto}</span>
            <button
                type="button"
                onClick={onQuitar}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg font-medium text-info hover:underline md:pointer-fine:min-h-9"
            >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                {t("filtro.quitar")}
            </button>
        </p>
    );
}
