/**
 * Preferencia de idioma (T4-04).
 *
 * Mismo trato que el tema (T4-11), y a propósito: tres estados con **`auto` como el que ve
 * quien nunca entra en Configuración**, guardado por dispositivo en `localStorage` y aplicado
 * antes de que React monte. Lo que cambia es de dónde sale el automático — aquí de
 * `navigator.language`, no de una media query— y que además hay que mover el `lang` de
 * `<html>`: de él dependen el lector de pantalla para elegir voz, el corrector ortográfico
 * del navegador y la partición de palabras.
 *
 * **No se guarda en la API**, por lo mismo que el tema: los ajustes de `/settings` son
 * globales a todos los usuarios, y el idioma es una preferencia de quien mira la pantalla.
 */

/** Los idiomas que la aplicación tiene traducidos. El primero es el de referencia. */
export const IDIOMAS = ["es", "en"] as const;

export type Idioma = (typeof IDIOMAS)[number];

/** Lo que el usuario puede elegir: un idioma concreto o dejarlo en manos del navegador. */
export const PREFERENCIAS_DE_IDIOMA = ["auto", ...IDIOMAS] as const;

export type PreferenciaDeIdioma = (typeof PREFERENCIAS_DE_IDIOMA)[number];

export const IDIOMA_POR_DEFECTO: Idioma = "es";

export const CLAVE_DE_IDIOMA = "stockly:idioma";

export function esIdioma(valor: unknown): valor is Idioma {
    return typeof valor === "string" && (IDIOMAS as readonly string[]).includes(valor);
}

export function esPreferenciaDeIdioma(valor: unknown): valor is PreferenciaDeIdioma {
    return typeof valor === "string" && (PREFERENCIAS_DE_IDIOMA as readonly string[]).includes(valor);
}

/**
 * El idioma que pide el navegador, reducido a los que existen.
 *
 * Se mira `languages` antes que `language` porque el primero es la lista ordenada de
 * preferencias reales del usuario: alguien con «en-GB, es-ES» tiene el inglés de primera
 * opción aunque su sistema esté en español. Se compara solo la parte primaria (`en-GB` → `en`),
 * que es lo que distingue idiomas; las variantes regionales no se traducen por separado.
 */
export function idiomaDelNavegador(): Idioma {
    const preferidos = typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]);

    for (const etiqueta of preferidos) {
        const primario = String(etiqueta ?? "").toLowerCase().split("-")[0];
        if (esIdioma(primario)) return primario;
    }

    return IDIOMA_POR_DEFECTO;
}

/** Ver `tema.ts`: `localStorage` **lanza** con el almacenamiento bloqueado, no devuelve null. */
export function leerPreferenciaDeIdioma(): PreferenciaDeIdioma {
    try {
        const guardado = window.localStorage.getItem(CLAVE_DE_IDIOMA);
        return esPreferenciaDeIdioma(guardado) ? guardado : "auto";
    } catch {
        return "auto";
    }
}

/** La preferencia, ya resuelta a un idioma que existe. Es lo que consume `traducir()`. */
export function idiomaEfectivo(preferencia: PreferenciaDeIdioma = leerPreferenciaDeIdioma()): Idioma {
    return preferencia === "auto" ? idiomaDelNavegador() : preferencia;
}

/**
 * El `lang` de `<html>` lleva **el idioma efectivo**, nunca «auto».
 *
 * Es un atributo con destinatario: un lector de pantalla elige la voz por él, y con `lang="es"`
 * leyendo inglés el resultado es ininteligible. Por eso aquí no vale la solución del tema
 * —quitar el atributo y dejar que decida el navegador—: `lang` no tiene modo automático.
 */
export function aplicarIdioma(preferencia: PreferenciaDeIdioma): void {
    document.documentElement.lang = idiomaEfectivo(preferencia);
}

const oyentes = new Set<() => void>();

export function suscribirseAlIdioma(alCambiar: () => void): () => void {
    oyentes.add(alCambiar);

    // Otra pestaña del mismo origen; `storage` nunca llega a la que escribe.
    const desdeOtraPestana = (evento: StorageEvent) => {
        if (evento.key === null || evento.key === CLAVE_DE_IDIOMA) {
            aplicarIdioma(leerPreferenciaDeIdioma());
            alCambiar();
        }
    };

    window.addEventListener("storage", desdeOtraPestana);

    return () => {
        oyentes.delete(alCambiar);
        window.removeEventListener("storage", desdeOtraPestana);
    };
}

export function elegirIdioma(preferencia: PreferenciaDeIdioma): void {
    try {
        window.localStorage.setItem(CLAVE_DE_IDIOMA, preferencia);
    } catch {
        // Almacenamiento bloqueado: vale hasta que se recargue. Ver `leerPreferenciaDeIdioma`.
    }

    aplicarIdioma(preferencia);
    for (const oyente of oyentes) oyente();
}
