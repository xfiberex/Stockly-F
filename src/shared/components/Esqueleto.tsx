import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { useT } from "@/shared/hooks/useIdioma";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";

/**
 * La carga de una lista, una tabla o una pantalla: su forma, en gris, mientras llegan los datos
 * (design-system.md §8). Lo pequeño o lo que no tiene forma que anticipar va con `Spinner`.
 *
 * **Solo la primera carga.** Al cambiar de página o de filtro, las pantallas conservan lo que
 * había (`placeholderData`) y lo atenúan con `isFetching`: un esqueleto ahí haría parpadear la
 * tabla en cada clic.
 *
 * Lo que lo hace barato, y no hay que deshacer:
 * - **Todo es CSS.** El retraso de 200 ms con el que aparece —una respuesta rápida no llega a
 *   enseñarlo— es un `animation-delay`, no un temporizador: ni un estado ni un render de más.
 * - **El pulso anima `opacity` de un solo elemento**, el envoltorio, no de cada barra: una
 *   capa que mueve el compositor, sin repintar. Un brillo que recorre las barras
 *   (`background-position`) repinta en cada fotograma.
 * - **Ocupa el sitio de lo que viene**: mismas tarjetas, mismos rellenos, filas de la altura
 *   de las de verdad. Es lo que evita que la pantalla salte al llegar los datos (CLS).
 * - Con movimiento reducido, la regla global lo deja quieto (`index.css`).
 *
 * Para el lector de pantalla es un `status` con «Cargando…»; las barras van ocultas.
 *
 * `className` va al envoltorio **interior**, el que contiene las formas: un `space-y` o un
 * `grid` en el exterior repartiría el texto oculto y el envoltorio, no las tarjetas. El
 * exterior solo aparece con retraso; el interior es el que late.
 *
 * **`esperando`: no pintar las formas hasta que lo de encima tenga su altura final.** Una
 * barra de filtros cuyo selector de almacén o de etiquetas sale al llegar su consulta crece
 * una fila, y empuja hacia abajo lo que tenga debajo. Con un spinner eso eran pocos píxeles;
 * con un esqueleto de diez filas, media pantalla: el CLS de Productos pasó de 0.05 a 0.34,
 * medido. Reservar el hueco no sirve —con un solo almacén el selector no sale, y el hueco se
 * cerraría—, así que se espera: lo que **aparece** no cuenta como desplazamiento, solo lo que
 * ya estaba y se mueve. El lector de pantalla oye «Cargando…» igual.
 */
export function ZonaCargando({ children, className, esperando = false }: { children: ReactNode; className?: string; esperando?: boolean }) {
    const { t } = useT();
    return (
        <div role="status" aria-busy="true" className="esqueleto">
            <span className="sr-only">{t("comun.cargando")}</span>
            {!esperando && (
                <div aria-hidden="true" className={cn("esqueleto-pulso", className)}>
                    {children}
                </div>
            )}
        </div>
    );
}

/** Una barra. La altura de una línea de texto, no la de su caja: `h-3` para `text-xs`. */
export function Barra({ className }: { className?: string }) {
    return <span className={cn("block h-3.5 rounded-full bg-border", className)} />;
}

// Anchos que se repiten fila a fila: una columna de barras iguales se lee como una rejilla,
// no como texto. Literales, para que Tailwind los genere.
const ANCHOS = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5"];

function FilasDeTabla({ filas, columnas }: { filas: number; columnas: number }) {
    const celdas = (fila: number) =>
        Array.from({ length: columnas }, (_, c) => (
            <div key={c} className={cn("min-w-0", c === 0 ? "flex-2" : "flex-1")}>
                <Barra className={ANCHOS[(fila + c) % ANCHOS.length]} />
            </div>
        ));

    return (
        <>
            {/* La cabecera de `CLASES_TABLA`: `text-xs` con `py-3`. */}
            <div className="flex gap-4 bg-surface-muted px-4 py-3">
                {Array.from({ length: columnas }, (_, c) => (
                    <div key={c} className={cn("min-w-0", c === 0 ? "flex-2" : "flex-1")}>
                        <Barra className="h-3 w-1/2" />
                    </div>
                ))}
            </div>
            {/* 48 px, la fila de las tablas con acciones (mínimo táctil de 44 más el borde). */}
            {Array.from({ length: filas }, (_, f) => (
                <div key={f} className="flex h-12 items-center gap-4 border-t border-border px-4">
                    {celdas(f)}
                </div>
            ))}
        </>
    );
}

/**
 * Una tabla: cabecera y filas, dentro de su tarjeta. `sinTarjeta` cuando la tabla de verdad
 * vive ya dentro de una, como las líneas de un conteo.
 */
export function EsqueletoTabla({ filas = 8, columnas = 5, sinTarjeta = false, esperando = false }: { filas?: number; columnas?: number; sinTarjeta?: boolean; esperando?: boolean }) {
    return (
        <ZonaCargando esperando={esperando} className={sinTarjeta ? undefined : "overflow-hidden rounded-xl border border-border bg-surface"}>
            <FilasDeTabla filas={filas} columnas={columnas} />
        </ZonaCargando>
    );
}

/**
 * Una lista de tarjetas en fila, como las órdenes: insignia, dos líneas y, a la derecha, el
 * importe y los botones de acción. En móvil se apilan, como las de verdad.
 */
export function EsqueletoLista({ filas = 5, className, esperando = false }: { filas?: number; className?: string; esperando?: boolean }) {
    return (
        <ZonaCargando esperando={esperando} className={cn("space-y-3", className)}>
            {Array.from({ length: filas }, (_, f) => (
                <div
                    key={f}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="block h-6 w-20 shrink-0 rounded-full bg-border" />
                        <div className="min-w-0 flex-1 space-y-2">
                            <Barra className="w-28" />
                            <Barra className={cn("h-3", f % 2 ? "w-44" : "w-56")} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Barra className="h-4 w-20" />
                        <span className="block h-11 w-11 rounded-lg bg-border" />
                        <span className="block h-11 w-11 rounded-lg bg-border" />
                    </div>
                </div>
            ))}
        </ZonaCargando>
    );
}

/** Tarjetas en rejilla, como las etiquetas o los almacenes. La rejilla la pone quien la usa. */
export function EsqueletoRejilla({
    tarjetas = 6,
    className,
    claseDeTarjeta = "h-14",
}: {
    tarjetas?: number;
    className: string;
    claseDeTarjeta?: string;
}) {
    return (
        <ZonaCargando className={className}>
            {Array.from({ length: tarjetas }, (_, i) => (
                <div key={i} className={cn("rounded-xl border border-border bg-surface p-4", claseDeTarjeta)}>
                    <Barra className={ANCHOS[i % ANCHOS.length]} />
                </div>
            ))}
        </ZonaCargando>
    );
}

function Cifras({ tarjetas }: { tarjetas: number }) {
    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: tarjetas }, (_, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border bg-surface p-5">
                    <Barra className="h-3 w-1/2" />
                    <Barra className="h-7 w-2/3" />
                </div>
            ))}
        </div>
    );
}

/** Bloques apilados, como las tarjetas de un formulario de ajustes. */
export function EsqueletoBloques({ bloques = 3, className }: { bloques?: number; className?: string }) {
    return (
        <ZonaCargando className={cn("space-y-6", className)}>
            {Array.from({ length: bloques }, (_, i) => (
                <div key={i} className="space-y-4 rounded-xl border border-border bg-surface p-5">
                    <Barra className="h-4 w-48" />
                    <Barra className="w-3/4" />
                    <Barra className="w-1/2" />
                    <span className="block h-11 w-full rounded-lg bg-border" />
                </div>
            ))}
        </ZonaCargando>
    );
}

/**
 * Una pantalla entera, para las que hoy no pintan nada hasta tener datos —el panel, los
 * informes, una ficha—: título, una fila de cifras y el cuerpo, que es una tabla o un bloque.
 *
 * `dentro`, para una pantalla que ya pinta su cabecera y sus filtros: solo cifras y cuerpo,
 * sin título ni contenedor.
 */
export function EsqueletoPagina({
    cifras = 4,
    cuerpo = "bloque",
    dentro = false,
}: {
    cifras?: number;
    cuerpo?: "bloque" | "tabla";
    dentro?: boolean;
}) {
    return (
        // El contenedor de página va dentro: es el interior el que reparte el `space-y-6`.
        <ZonaCargando className={dentro ? "space-y-6" : CLASES_CONTENEDOR_DE_PAGINA}>
            {!dentro && (
                <div className="space-y-2">
                    <Barra className="h-7 w-56" />
                    <Barra className="w-40" />
                </div>
            )}
            {cifras > 0 && <Cifras tarjetas={cifras} />}
            {cuerpo === "tabla" ? (
                <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <FilasDeTabla filas={8} columnas={5} />
                </div>
            ) : (
                <div className="h-72 rounded-xl border border-border bg-surface p-5">
                    <Barra className="h-4 w-48" />
                </div>
            )}
        </ZonaCargando>
    );
}
