import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";

/**
 * AUD-019 — una lista vacía que dice **por qué** lo está.
 *
 * Conteos, Transferencias y Caducidades decían «Todavía no hay…» también con un filtro puesto: con
 * `?estado=CLOSED` y ninguno cerrado, la pantalla aseguraba que no había conteos, y los había. Quien
 * la usa pasa el texto que corresponde (vacía de verdad, o vacía con este filtro) y, si hay filtros,
 * cómo quitarlos: la salida está al lado del mensaje, no arriba entre los desplegables.
 */
export function VacioDeLista({ texto, onQuitarFiltros }: { texto: string; onQuitarFiltros?: () => void }) {
    const { t } = useT();
    return (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-foreground-muted">
            <p className="text-pretty">{texto}</p>
            {onQuitarFiltros && (
                <Button variant="secondary" onClick={onQuitarFiltros}>
                    {t("filtro.quitarTodos")}
                </Button>
            )}
        </div>
    );
}
