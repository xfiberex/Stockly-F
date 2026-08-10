/**
 * Preferencia de tema (T4-11).
 *
 * Tres estados, y el importante es el primero: **`auto`** delega en el sistema operativo y
 * es lo que ve quien nunca entra en Configuración. Los otros dos son una elección explícita
 * que sobrescribe esa preferencia.
 *
 * El mecanismo entero es un atributo en `<html>`:
 *
 *     auto    → sin atributo   → `:root { color-scheme: light dark }` → prefers-color-scheme
 *     claro   → data-tema=claro  → `color-scheme: light`
 *     oscuro  → data-tema=oscuro → `color-scheme: dark`
 *
 * No hay clases `dark:` ni un segundo juego de tokens: cada color de `index.css` se declara
 * con `light-dark(claro, oscuro)` y el navegador resuelve el par según ese `color-scheme`.
 *
 * **Se guarda en `localStorage`, no en la API.** Los ajustes de `/settings` son globales de
 * la aplicación —los comparten todos los usuarios—, así que guardar ahí el tema haría que la
 * elección de uno cambiara la pantalla de los demás. Y aunque fueran por usuario, el tema es
 * una preferencia de **dispositivo**: el mismo usuario puede querer oscuro en el móvil de
 * noche y claro en el escritorio.
 */

export const TEMAS = ["auto", "claro", "oscuro"] as const;

export type Tema = (typeof TEMAS)[number];

/** Espacio de nombres para no chocar con otras claves del mismo origen. */
export const CLAVE_DE_TEMA = "stockly:tema";

/** `dataset.tema` en `<html>`; en CSS, `:root[data-tema="…"]`. */
export const ATRIBUTO_DE_TEMA = "tema";

export function esTema(valor: unknown): valor is Tema {
    return typeof valor === "string" && (TEMAS as readonly string[]).includes(valor);
}

/**
 * `localStorage` lanza —no devuelve `null`— cuando el navegador bloquea el almacenamiento:
 * Safari en navegación privada, o cualquiera con las cookies de terceros desactivadas en un
 * iframe. Sin este `try`, la aplicación no arrancaría por no poder leer una preferencia.
 * Sin preferencia legible, `auto`, que es el comportamiento correcto por defecto.
 */
export function leerTema(): Tema {
    try {
        const guardado = window.localStorage.getItem(CLAVE_DE_TEMA);
        return esTema(guardado) ? guardado : "auto";
    } catch {
        return "auto";
    }
}

/** Escribe el atributo. `auto` lo **quita**, que es lo que devuelve el control a la media query. */
export function aplicarTema(tema: Tema): void {
    const raiz = document.documentElement;

    if (tema === "auto") delete raiz.dataset[ATRIBUTO_DE_TEMA];
    else raiz.dataset[ATRIBUTO_DE_TEMA] = tema;
}

/*
 * `storage` solo avisa a las **otras** pestañas, nunca a la que escribe. Para que el
 * componente que cambió el tema también se entere hace falta este registro propio; sin él,
 * el selector se quedaría marcando la opción anterior aunque la página ya hubiera cambiado
 * de color.
 */
const oyentes = new Set<() => void>();

function avisar(): void {
    for (const oyente of oyentes) oyente();
}

export function suscribirseAlTema(alCambiar: () => void): () => void {
    oyentes.add(alCambiar);
    // Otra pestaña del mismo origen: el evento trae la clave, y el resto se relee.
    const desdeOtraPestana = (evento: StorageEvent) => {
        if (evento.key === null || evento.key === CLAVE_DE_TEMA) {
            aplicarTema(leerTema());
            alCambiar();
        }
    };

    window.addEventListener("storage", desdeOtraPestana);

    return () => {
        oyentes.delete(alCambiar);
        window.removeEventListener("storage", desdeOtraPestana);
    };
}

/**
 * Guarda, aplica y avisa. El orden importa poco salvo en un detalle: se **aplica siempre**,
 * incluso si el guardado falla, para que la elección valga al menos en esta sesión.
 */
export function elegirTema(tema: Tema): void {
    try {
        window.localStorage.setItem(CLAVE_DE_TEMA, tema);
    } catch {
        // Almacenamiento bloqueado: el tema vale hasta que se recargue. Ver `leerTema`.
    }

    aplicarTema(tema);
    avisar();
}
