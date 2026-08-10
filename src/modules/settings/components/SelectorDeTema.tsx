import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/shared/lib/cn";
import { useTema } from "@/shared/hooks/useTema";
import type { Tema } from "@/shared/lib/tema";

/**
 * T4-11 — elección de tema: claro, oscuro o automático.
 *
 * Son **radios nativos**, no botones con `aria-pressed`: un grupo de radio se recorre con
 * las flechas y entra con un solo tabulador, y el lector de pantalla anuncia «2 de 3». Con
 * botones habría que reimplementar todo eso a mano y salir peor.
 *
 * Los radios van `sr-only` y quien pinta es la etiqueta que los envuelve, con `has-[:checked]`
 * y `has-[:focus-visible]`. Así el control se ve como un segmentado sin perder nada del
 * comportamiento nativo — incluido el clic en cualquier punto de la etiqueta.
 *
 * **Se aplica al instante y no pasa por «Guardar cambios»**: es una preferencia local, no un
 * ajuste de la aplicación (ver `shared/lib/tema.ts` sobre por qué no vive en la API).
 */

const OPCIONES: ReadonlyArray<{
    valor: Tema;
    etiqueta: string;
    descripcion: string;
    Icono: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
    { valor: "auto", etiqueta: "Automático", descripcion: "Sigue la preferencia del sistema", Icono: ComputerDesktopIcon },
    { valor: "claro", etiqueta: "Claro", descripcion: "Siempre en claro", Icono: SunIcon },
    { valor: "oscuro", etiqueta: "Oscuro", descripcion: "Siempre en oscuro", Icono: MoonIcon },
];

export function SelectorDeTema() {
    const { tema, cambiarTema } = useTema();

    return (
        <fieldset>
            <legend className="text-sm font-medium text-foreground">Tema</legend>
            <p className="text-xs text-foreground-muted mt-0.5">
                Se aplica al instante y se recuerda solo en este dispositivo.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {OPCIONES.map(({ valor, etiqueta, descripcion, Icono }) => (
                    <label
                        key={valor}
                        className={cn(
                            // `min-h-11` es el mínimo táctil de T2-40, y aquí no hace falta
                            // levantarlo en `md`: la diana es la etiqueta entera, no un carril.
                            "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground-muted transition",
                            "hover:border-foreground-muted",
                            "has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:font-medium has-[:checked]:text-foreground",
                            // `ring-offset-surface` no es decorativo: el hueco del anillo lo
                            // pinta Tailwind de blanco por defecto, y en oscuro eso es un halo.
                            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface",
                        )}
                    >
                        <input
                            type="radio"
                            name="tema"
                            value={valor}
                            checked={tema === valor}
                            onChange={() => cambiarTema(valor)}
                            className="sr-only"
                        />
                        <Icono aria-hidden="true" className="h-5 w-5 shrink-0" />
                        <span>{etiqueta}</span>
                        {/* La etiqueta visible cabe en una palabra; el matiz va al nombre
                            accesible, que es donde no estorba. */}
                        <span className="sr-only">— {descripcion}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
