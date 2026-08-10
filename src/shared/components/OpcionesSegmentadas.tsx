import type { ComponentType, SVGProps } from "react";
import { cn } from "@/shared/lib/cn";

export interface OpcionSegmentada<T extends string> {
    valor: T;
    etiqueta: string;
    /** Matiz que solo oye el lector de pantalla: la etiqueta visible cabe en una palabra. */
    descripcion: string;
    Icono: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Un grupo de opciones excluyentes con aspecto de segmentado (T4-11, T4-04).
 *
 * Son **radios nativos**, no botones con `aria-pressed`: un grupo de radio se recorre con las
 * flechas, entra con un solo tabulador y el lector anuncia «2 de 3». Con botones habría que
 * reimplementar todo eso a mano y saldría peor.
 *
 * Los radios van `sr-only` y quien pinta es la etiqueta que los envuelve, con `has-[:checked]`
 * y `has-[:focus-visible]`. Así se ve como un segmentado sin perder nada del comportamiento
 * nativo — incluido el clic en cualquier punto de la etiqueta.
 *
 * Nació al añadir el segundo grupo idéntico —tema e idioma— en la misma tarjeta: dos copias del
 * mismo `<fieldset>` habrían divergido en el primer retoque de accesibilidad.
 */
export function OpcionesSegmentadas<T extends string>({
    leyenda,
    ayuda,
    nombre,
    opciones,
    valor,
    onCambio,
}: {
    leyenda: string;
    ayuda: string;
    /** El `name` del grupo de radio: es lo que los hace excluyentes entre sí. */
    nombre: string;
    opciones: ReadonlyArray<OpcionSegmentada<T>>;
    valor: T;
    onCambio: (valor: T) => void;
}) {
    return (
        <fieldset>
            <legend className="text-sm font-medium text-foreground">{leyenda}</legend>
            <p className="text-xs text-foreground-muted mt-0.5">{ayuda}</p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {opciones.map(({ valor: propio, etiqueta, descripcion, Icono }) => (
                    <label
                        key={propio}
                        className={cn(
                            // `min-h-11` es el mínimo táctil de T2-40, y aquí no hace falta
                            // levantarlo en `md`: la diana es la etiqueta entera, no un carril.
                            "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted transition",
                            "hover:border-foreground-muted",
                            "has-checked:border-accent has-checked:bg-accent/10 has-checked:font-medium has-checked:text-foreground",
                            // `ring-offset-surface` no es decorativo: el hueco del anillo lo
                            // pinta Tailwind de blanco por defecto, y en oscuro eso es un halo.
                            "has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-surface",
                        )}
                    >
                        <input
                            type="radio"
                            name={nombre}
                            value={propio}
                            checked={valor === propio}
                            onChange={() => onCambio(propio)}
                            className="sr-only"
                        />
                        <Icono aria-hidden="true" className="h-5 w-5 shrink-0" />
                        <span>{etiqueta}</span>
                        <span className="sr-only">— {descripcion}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
