import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { idDePanel, idDePestana } from "@/shared/lib/pestanas";

export interface Pestana<T extends string> {
    valor: T;
    etiqueta: string;
}

/**
 * Pestañas con el patrón de la WAI-ARIA (AUD-018).
 *
 * Las de Movimientos eran tres botones sueltos: se veía cuál estaba activa por el color y el
 * subrayado, y el lector de pantalla oía tres botones sin relación entre sí ni estado. Aquí
 * son un `tablist` con `aria-selected`, y se recorren como pide el patrón: **una sola parada
 * de tabulador** —la pestaña activa—, las flechas para moverse entre ellas, Inicio y Fin para
 * ir a los extremos. Se activa al moverse (activación automática): cambiar de pestaña no
 * cuesta nada, los tres paneles son lecturas.
 */
export function Pestanas<T extends string>({
    base,
    etiqueta,
    pestanas,
    activa,
    onCambio,
}: {
    /** Prefijo de los `id`; con `useId()` en quien la usa, no choca con otra en la misma pantalla. */
    base: string;
    /** El nombre del grupo, que el lector anuncia al entrar. */
    etiqueta: string;
    pestanas: ReadonlyArray<Pestana<T>>;
    activa: T;
    onCambio: (valor: T) => void;
}) {
    const botones = useRef<Array<HTMLButtonElement | null>>([]);

    const irA = (indice: number) => {
        const destino = (indice + pestanas.length) % pestanas.length;
        onCambio(pestanas[destino].valor);
        botones.current[destino]?.focus();
    };

    const alPulsarTecla = (e: KeyboardEvent<HTMLButtonElement>, indice: number) => {
        const movimientos: Record<string, number> = {
            ArrowRight: indice + 1,
            ArrowLeft: indice - 1,
            Home: 0,
            End: pestanas.length - 1,
        };
        if (!(e.key in movimientos)) return;
        e.preventDefault();
        irA(movimientos[e.key]);
    };

    /*
     * Dos cajas, y no una, por el desplazamiento. A 390 px las tres pestañas de Movimientos no
     * caben, así que la lista se desplaza en horizontal, y un desplazador recorta lo que se le
     * sale (`contain-paint`, T2-45). El subrayado de la activa monta un píxel sobre la línea
     * gris: si la línea fuera de la propia lista, ese píxel quedaría fuera y se recortaría. Por
     * eso la línea es del envoltorio y es **la lista** la que baja un píxel sobre ella, con lo
     * que el subrayado queda dentro de lo que se pinta.
     */
    return (
        <div className="border-b border-border">
            <div role="tablist" aria-label={etiqueta} className="-mb-px flex gap-1 overflow-x-auto contain-paint sin-barra">
                {pestanas.map(({ valor, etiqueta: texto }, indice) => {
                    const seleccionada = valor === activa;
                    return (
                        <button
                            key={valor}
                            ref={(nodo) => {
                                botones.current[indice] = nodo;
                            }}
                            type="button"
                            role="tab"
                            id={idDePestana(base, valor)}
                            aria-selected={seleccionada}
                            aria-controls={idDePanel(base, valor)}
                            tabIndex={seleccionada ? 0 : -1}
                            onClick={() => onCambio(valor)}
                            onKeyDown={(e) => alPulsarTecla(e, indice)}
                            className={cn(
                                "min-h-11 shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors md:pointer-fine:min-h-9",
                                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                                seleccionada
                                    ? "border-info text-info"
                                    : "border-transparent text-foreground-muted hover:text-foreground",
                            )}
                        >
                            {texto}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
