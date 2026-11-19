import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";

interface Zona {
    /** El nombre IANA, que es lo que se guarda: `America/Santo_Domingo`. */
    valor: string;
    /** El que se lee: `America/Santo Domingo`. */
    rotulo: string;
    /** El desfase de hoy, `UTC−4`, o `""` si el navegador no sabe darlo. */
    desfase: string;
    /** Rótulo y desfase normalizados, para buscar. */
    clave: string;
}

/** Minúsculas, sin tildes, con `_` como espacio y el signo menos tipográfico como guion. */
function normalizar(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replaceAll("_", " ")
        .replaceAll("−", "-")
        .replaceAll("gmt", "utc");
}

/**
 * El desfase de una zona **hoy**, como `UTC−4` o `UTC+5:30`. Es lo que de verdad distingue dos
 * zonas para quien elige («¿la mía es −4 o −5?»), y deja buscar por él. Cambia con el horario de
 * verano, y por eso dice el de hoy y no uno fijo.
 */
function desfaseDe(zona: string, ahora: Date): string {
    try {
        const parte = new Intl.DateTimeFormat("en-US", { timeZone: zona, timeZoneName: "shortOffset" })
            .formatToParts(ahora)
            .find((p) => p.type === "timeZoneName")?.value;
        return parte ? parte.replace("GMT", "UTC").replace("-", "−") : "";
    } catch {
        return "";
    }
}

/**
 * T5-09 — las zonas que conoce el navegador, para no escribir un nombre IANA a mano. La guardada
 * se añade si el navegador no la lista —`UTC`, por ejemplo, no sale en todos—, o el campo
 * enseñaría otra distinta de la que está en vigor.
 */
function zonasDisponibles(guardada: string): Zona[] {
    const enCache = CACHE.get(guardada);
    if (enCache) return enCache;
    const nombres = Intl.supportedValuesOf("timeZone");
    if (!nombres.includes(guardada)) nombres.unshift(guardada);
    const ahora = new Date();
    const zonas = nombres.map((valor) => {
        const rotulo = rotuloDe(valor);
        const desfase = desfaseDe(valor, ahora);
        return { valor, rotulo, desfase, clave: normalizar(`${rotulo} ${desfase}`) };
    });
    CACHE.set(guardada, zonas);
    return zonas;
}

/**
 * Un `Intl.DateTimeFormat` por zona son ~420 objetos: se construyen **al abrir la lista por
 * primera vez** y valen para toda la sesión, no en cada visita a Configuración, donde casi nadie
 * la abre. El desfase es el de ese día; una sesión que cruce un cambio de hora enseñaría el de
 * antes hasta recargar, y eso es aceptable para elegir la zona.
 */
const CACHE = new Map<string, Zona[]>();

/**
 * Cuántas opciones se pintan a la vez. Abierta sin texto, la lista tiene ~420 zonas, y pintarlas
 * todas en cada apertura —y en cada tecla— era lo caro de esta pantalla (en el entorno de tests
 * agotaba los 5 s). Se pinta una ventana alrededor de la activa, que se mueve cuando la activa
 * sale de ella; lo de fuera se dice en una línea y se alcanza escribiendo o con las flechas.
 */
const VENTANA = 60;
const SIN_ZONAS: Zona[] = [];

/** `America/Santo_Domingo` → `America/Santo Domingo`. */
function rotuloDe(zona: string): string {
    return zona.replaceAll("_", " ");
}

/** Cada palabra escrita tiene que estar en la zona, en cualquier orden: «santo america» vale. */
function filtrar(zonas: Zona[], texto: string): Zona[] {
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return zonas;
    return zonas.filter((z) => palabras.every((p) => z.clave.includes(p)));
}

interface SelectorDeZonaHorariaProps {
    valor: string;
    /** La que está guardada en el servidor: se ofrece aunque el navegador no la conozca. */
    guardada: string;
    onChange: (zona: string) => void;
    "aria-labelledby": string;
    "aria-describedby": string;
}

/**
 * AUD-019 — la zona horaria del negocio, **con búsqueda**. Era un `<select>` de unas 420
 * opciones en orden alfabético: para llegar a `America/Santo_Domingo` había que bajar por
 * África entera, y en el móvil la rueda del sistema no deja escribir.
 *
 * Combobox de ARIA 1.2, como `BuscadorDeCliente`: el foco se queda en el campo, la opción activa
 * va por `aria-activedescendant`, Enter elige y Escape cierra **devolviendo** lo que había. El
 * campo enseña la zona elegida mientras no se escribe; salir sin elegir no cambia nada, así que
 * nunca queda a medias un nombre que no es una zona.
 */
export function SelectorDeZonaHoraria({ valor, guardada, onChange, ...rotulos }: SelectorDeZonaHorariaProps) {
    const { t } = useT();
    const id = useId();
    const idLista = `${id}-lista`;
    const lista = useRef<HTMLUListElement>(null);

    // `null`: no se está escribiendo, y el campo enseña la zona elegida.
    const [texto, setTexto] = useState<string | null>(null);
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);

    // Cerrada, la lista no hace falta: el campo solo enseña el rótulo de la elegida.
    const zonas = abierto ? zonasDisponibles(guardada) : SIN_ZONAS;
    const opciones = useMemo(() => filtrar(zonas, texto ?? ""), [zonas, texto]);
    const idOpcion = (i: number) => `${id}-opcion-${i}`;

    // La ventana solo se mueve cuando la activa se sale: pasar el ratón por encima cambia la activa,
    // y si la ventana la siguiera, la lista saltaría bajo el puntero.
    const [inicio, setInicio] = useState(0);
    const inicioMaximo = Math.max(0, opciones.length - VENTANA);
    const inicioValido =
        activo < inicio || activo >= inicio + VENTANA || inicio > inicioMaximo
            ? Math.min(inicioMaximo, Math.max(0, activo - VENTANA / 2))
            : inicio;
    // Estado derivado del render anterior: el patrón que React documenta para esto, sin efecto.
    if (inicioValido !== inicio) setInicio(inicioValido);
    const visibles = opciones.slice(inicioValido, inicioValido + VENTANA);
    const fueraDeLaVentana = opciones.length - visibles.length;

    // La opción activa, a la vista: al abrir, la elegida puede estar a trescientas filas. Al abrir
    // va **centrada**, con sus vecinas a los dos lados; con «nearest» quedaba pegada al borde de
    // abajo. Al moverse con las flechas, «nearest»: la lista solo se desplaza lo justo.
    const recienAbierto = useRef(false);
    useEffect(() => {
        if (!abierto) return;
        const block = recienAbierto.current ? "center" : "nearest";
        recienAbierto.current = false;
        lista.current?.querySelector(`[id="${idOpcion(activo)}"]`)?.scrollIntoView?.({ block });
        // `idOpcion` depende solo de `id`, que no cambia.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [abierto, activo]);

    const abrir = () => {
        if (abierto) return;
        recienAbierto.current = true;
        setAbierto(true);
        // Sin texto, la lista es entera: se abre por la zona que ya está puesta.
        setActivo(Math.max(0, zonasDisponibles(guardada).findIndex((z) => z.valor === valor)));
    };

    const cerrar = () => {
        setAbierto(false);
        setTexto(null);
    };

    const elegir = (zona: Zona) => {
        onChange(zona.valor);
        cerrar();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!abierto) return abrir();
            setActivo((i) => Math.min(i + 1, opciones.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!abierto) return abrir();
            setActivo((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            // En esta página no hay formulario que enviar, pero Enter con la lista cerrada no
            // tiene por qué hacer nada.
            e.preventDefault();
            if (abierto && opciones[activo]) elegir(opciones[activo]);
        } else if (e.key === "Escape" && abierto) {
            e.stopPropagation();
            cerrar();
        }
    };

    return (
        <div className="relative">
            <input
                id={id}
                type="text"
                role="combobox"
                autoComplete="off"
                spellCheck={false}
                aria-autocomplete="list"
                aria-expanded={abierto}
                aria-controls={idLista}
                aria-activedescendant={abierto && opciones[activo] ? idOpcion(activo) : undefined}
                {...rotulos}
                placeholder={t("configuracion.zona.buscar")}
                value={texto ?? rotuloDe(valor)}
                // Al entrar se selecciona lo escrito: teclear lo sustituye, sin borrar a mano.
                onFocus={(e) => { e.target.select(); abrir(); }}
                onClick={abrir}
                onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
                onBlur={cerrar}
                onKeyDown={onKeyDown}
                className={cn(
                    "min-h-11 w-full rounded-lg border border-border bg-surface py-1.5 pl-3 pr-9 text-sm text-foreground placeholder-foreground-muted outline-none transition md:pointer-fine:min-h-9",
                    "focus:border-accent focus:ring-2 focus:ring-accent/20",
                )}
            />
            <ChevronUpDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" aria-hidden="true" />
            <ul
                ref={lista}
                id={idLista}
                role="listbox"
                aria-label={t("configuracion.zona.lista")}
                hidden={!abierto}
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-overlay"
            >
                {opciones.length === 0 ? (
                    <li role="presentation" className="px-3 py-2 text-sm text-foreground-muted">
                        {t("configuracion.zona.ninguna", { texto: texto ?? "" })}
                    </li>
                ) : (
                    <>
                        {visibles.map((zona, posicion) => {
                            // El índice en la lista entera: es el que llevan `activo` y el `id`.
                            const i = inicioValido + posicion;
                            return (
                                <li
                                    key={zona.valor}
                                    id={idOpcion(i)}
                                    role="option"
                                    aria-selected={zona.valor === valor}
                                    // `mousedown` y no `click`: el clic llega después del `blur` del campo,
                                    // que ya ha cerrado la lista.
                                    onMouseDown={(e) => { e.preventDefault(); elegir(zona); }}
                                    onMouseEnter={() => setActivo(i)}
                                    className={cn(
                                        "flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm text-foreground",
                                        i === activo && "bg-accent/10",
                                        zona.valor === valor && "font-medium",
                                    )}
                                >
                                    <span className="min-w-0 wrap-break-word">{zona.rotulo}</span>
                                    {zona.desfase && <span className="shrink-0 text-xs tabular-nums text-foreground-muted">{zona.desfase}</span>}
                                </li>
                            );
                        })}
                        {fueraDeLaVentana > 0 && (
                            <li role="presentation" className="px-3 py-2 text-xs text-foreground-muted">
                                {t("configuracion.zona.mas", { cantidad: fueraDeLaVentana })}
                            </li>
                        )}
                    </>
                )}
            </ul>
        </div>
    );
}
