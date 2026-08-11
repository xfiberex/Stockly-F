import { es } from "@/shared/i18n/es";
import { en } from "@/shared/i18n/en";
import { IDIOMA_POR_DEFECTO, type Idioma } from "@/shared/i18n/idioma";

/**
 * El motor de traducción (T4-04). Son treinta líneas, y esa es la decisión.
 *
 * `i18next` resuelve muchos problemas que este proyecto no tiene: cadenas de respaldo entre
 * regiones, espacios de nombres cargados por separado, seis formas de plural, detección por
 * cabecera, backends remotos. Aquí hay **dos idiomas**, los dos con las mismas dos formas de
 * plural, y un catálogo que cabe en dos archivos. Lo que de verdad protege esto no es una
 * librería: es que `i18n.test.ts` exija que los dos catálogos tengan **exactamente** las
 * mismas claves y que ningún componente conserve un literal en español.
 *
 * Lo que se renuncia queda escrito en [ADR 0007](../../../../Stockly-B/docs/adr/0007-i18n-propio.md):
 * sin `Trans` para meter marcado dentro de una frase, sin extracción automática y sin contexto
 * gramatical. Las tres se pagan con disciplina, y las tres tienen guardia.
 */

export type Clave = keyof typeof es;

/**
 * Las claves que tienen formas de plural, deducidas del propio catálogo: se queda con la raíz
 * de cada `…_other`. Así `tn()` **solo acepta las que de verdad tienen plural**, y pedirle una
 * clave normal es un error de compilación en vez de un texto que sale en crudo.
 *
 * El paso por `RaizPlural<K>` no es adorno: un condicional solo se reparte por la unión cuando
 * lo que compara es un **parámetro de tipo desnudo**. Escrito directamente sobre `Clave`, la
 * unión entera se compara contra el patrón, no casa ninguna, y el resultado es `never` — que
 * compila igual de bien y deja `tn()` inservible sin decir por qué.
 */
type RaizPlural<K> = K extends `${infer Raiz}_other` ? Raiz : never;

export type ClavePlural = RaizPlural<Clave>;

/** Los valores que se interpolan: `{nombre}` en la plantilla. */
export type Valores = Record<string, string | number>;

const CATALOGOS: Record<Idioma, Record<Clave, string>> = { es, en };

/**
 * Sufijos de plural. `Intl.PluralRules` devuelve la categoría —`one`, `other`…— y la clave
 * real es `<clave>_<categoría>`. Español e inglés solo usan estas dos, pero la búsqueda cae a
 * `_other` para cualquier otra: así, si algún día entra un idioma con `few` o `many`, una clave
 * sin traducir da la forma general en vez de reventar.
 */
const PLURAL = new Map<Idioma, Intl.PluralRules>();

function categoriaDePlural(idioma: Idioma, cantidad: number): Intl.LDMLPluralRule {
    let reglas = PLURAL.get(idioma);
    if (!reglas) {
        reglas = new Intl.PluralRules(idioma);
        PLURAL.set(idioma, reglas);
    }
    return reglas.select(cantidad);
}

function interpolar(plantilla: string, valores?: Valores): string {
    if (!valores) return plantilla;
    return plantilla.replace(/\{(\w+)\}/g, (completo, nombre: string) =>
        nombre in valores ? String(valores[nombre]) : completo,
    );
}

/**
 * Traduce una clave. Que `Clave` sea una unión de literales es lo que convierte una errata en
 * un error de compilación en vez de en un hueco en la pantalla.
 *
 * El respaldo al español no es cosmético: durante la extracción, una clave añadida al catálogo
 * de referencia y olvidada en el otro pinta el texto en español —feo pero legible— en vez de
 * dejar la clave cruda a la vista. Aun así, el test no lo permite; el respaldo es para el rato
 * en que alguien está escribiendo.
 */
export function traducir(idioma: Idioma, clave: Clave, valores?: Valores): string {
    const plantilla = CATALOGOS[idioma]?.[clave] ?? CATALOGOS[IDIOMA_POR_DEFECTO][clave] ?? clave;
    return interpolar(plantilla, valores);
}

/**
 * Traduce eligiendo forma según la cantidad, que se interpola como `{cantidad}`.
 *
 * Existe porque el proyecto ya tenía el apaño a mano —`fila${n !== 1 ? "s" : ""}`— y ese truco
 * no sobrevive a un idioma más: en inglés la `s` va en otro sitio, y en cuanto entrara un tercer
 * idioma tampoco serían dos formas.
 */
export function traducirCantidad(
    idioma: Idioma,
    clave: ClavePlural,
    cantidad: number,
    valores?: Valores,
): string {
    const categoria = categoriaDePlural(idioma, cantidad);
    const conForma = `${clave}_${categoria}` as Clave;
    const claveReal = conForma in CATALOGOS[IDIOMA_POR_DEFECTO] ? conForma : (`${clave}_other` as Clave);

    return traducir(idioma, claveReal, { cantidad, ...valores });
}

/** Las claves declaradas en el catálogo de referencia. Lo usan las guardias. */
export function clavesDelCatalogo(): Clave[] {
    return Object.keys(es) as Clave[];
}

/**
 * Si una clave **construida al vuelo** existe en el catálogo.
 *
 * Hace falta donde la clave sale de un dato del servidor y no del código: los ajustes de
 * `/settings` traen su propio rótulo en español y la interfaz prefiere el suyo, pero un
 * ajuste nuevo que el backend estrene todavía no tendrá traducción. Sin esta comprobación
 * se vería la clave en crudo —`traducir()` la devuelve tal cual—, que es peor que el texto
 * del servidor.
 */
export function existeClave(clave: string): clave is Clave {
    return clave in es;
}
