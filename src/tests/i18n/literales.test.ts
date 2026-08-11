import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * T4-04 — la guardia que impide que vuelva a colarse un texto sin traducir.
 *
 * El catálogo con sus dos idiomas lo vigila el compilador (`en.ts` es un `Record` sobre las
 * claves de `es.ts`), pero eso solo comprueba lo que **ya está** en el catálogo. Nada impide
 * escribir `<h1>Productos</h1>` en una pantalla nueva: compila, se ve bien en español y está
 * roto en inglés sin que ningún test lo note. Esto es lo que faltaba.
 *
 * **Qué se considera texto de interfaz**, y por qué solo esto:
 *
 * - El contenido de un nodo JSX (`>texto<`), que es lo que se lee en pantalla.
 * - Las props que un lector de pantalla o el navegador enseñan: `label`, `placeholder`,
 *   `title`, `aria-label`, `alt`, `summary`.
 * - El argumento literal de un `toast.*`, que son los avisos.
 *
 * No se mira dentro de las llaves: `{t("...")}`, los `className` y cualquier expresión
 * quedan fuera por construcción. Es un análisis por texto, no un AST — y es a propósito:
 * un AST completo aquí sería una dependencia más y un test más lento para detectar lo
 * mismo, porque lo que se busca son literales escritos a mano, no expresiones complicadas.
 *
 * **La lista de excepciones es corta y cada una dice por qué.** Si al añadir una pantalla
 * este test se pone en rojo, la respuesta casi siempre es extraer la cadena al catálogo,
 * no ampliar la lista.
 */

const RAIZ = join(__dirname, "..", "..");

/** Carpetas que no son interfaz: sus cadenas no las lee nadie en pantalla. */
const CARPETAS_EXCLUIDAS = ["tests", "i18n", "contratos"];

/**
 * Símbolos y fragmentos que aparecen sueltos en el marcado y no son idioma: rayas de
 * «sin dato», separadores, iconos de texto y el nombre del producto.
 */
const NO_ES_TEXTO = /^[\s\d\W_]*$/u;

const PERMITIDOS = new Set([
    // El nombre del producto no se traduce, ni siquiera al inglés.
    "Stockly",
    // Los idiomas se escriben **en su propio idioma** en el selector: quien tiene la
    // aplicación en uno que no entiende necesita reconocer el suyo en la lista.
    "Español",
    "English",
]);

function archivosDeInterfaz(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) {
            return CARPETAS_EXCLUIDAS.includes(entrada) ? [] : archivosDeInterfaz(ruta);
        }
        return /\.tsx?$/.test(entrada) ? [ruta] : [];
    });
}

/** Quita comentarios de línea y de bloque: ahí el español es la convención del proyecto. */
function sinComentarios(codigo: string): string {
    return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const PROPS_VISIBLES = /(?:label|placeholder|title|aria-label|alt|summary)="([^"]*)"/g;
const AVISOS = /toast\.\w+\(\s*"([^"]*)"/g;

/**
 * El contenido de un nodo JSX, **en una sola línea**.
 *
 * Sin la restricción de línea, `>` y `<` también casan con los genéricos de TypeScript
 * (`useState<Producto>(null)`) y con las comparaciones, y el test señalaba trozos de
 * código. Que el texto quepa en una línea y no traiga signos de expresión es lo que
 * distingue «Productos» de `) : orders.length === 0 ? (`.
 */
const TEXTO_JSX = />([^<>{}\n]+)</g;

/** Un fragmento con paréntesis, punto y coma o comparadores es código, no una frase. */
const PARECE_CODIGO = /[;=()[\]|&`]/;

/** Dos letras seguidas: descarta «—», «+3», «#», «✉» y demás señales sueltas. */
const TIENE_PALABRA = /\p{L}{2}/u;

function literalesDe(codigo: string): string[] {
    const limpio = sinComentarios(codigo);
    const encontrados: string[] = [];

    for (const patron of [PROPS_VISIBLES, TEXTO_JSX, AVISOS]) {
        for (const [, texto] of limpio.matchAll(patron)) {
            const valor = texto.trim();
            if (valor === "" || NO_ES_TEXTO.test(valor) || PERMITIDOS.has(valor)) continue;
            if (!TIENE_PALABRA.test(valor) || PARECE_CODIGO.test(valor)) continue;
            encontrados.push(valor);
        }
    }

    return encontrados;
}

describe("Literales de interfaz (T4-04)", () => {
    const archivos = archivosDeInterfaz(RAIZ);

    it("hay pantallas que revisar", () => {
        // Si un cambio de estructura dejara la lista vacía, el test seguiría en verde sin
        // comprobar nada. Es el defecto que T4-02 encontró en su propio guardián.
        expect(archivos.length).toBeGreaterThan(40);
    });

    it("ningún componente conserva un texto escrito a mano", () => {
        const infractores = archivos
            .map((ruta) => ({ ruta: relative(RAIZ, ruta).split(sep).join("/"), textos: literalesDe(readFileSync(ruta, "utf8")) }))
            .filter(({ textos }) => textos.length > 0)
            .map(({ ruta, textos }) => `${ruta}: ${textos.map((texto) => `«${texto}»`).join(", ")}`);

        expect(infractores).toEqual([]);
    });

    it("detecta un literal metido a mano", () => {
        // Falsificación del guardián: sin esto, un fallo en la extracción de literales lo
        // dejaría mudo y el test de arriba pasaría siempre.
        expect(literalesDe('<h1>Productos</h1>')).toEqual(["Productos"]);
        expect(literalesDe('<Input label="Nombre" />')).toEqual(["Nombre"]);
        expect(literalesDe('toast.success("Producto creado")')).toEqual(["Producto creado"]);
        expect(literalesDe('<h1>{t("ruta.productos")}</h1>')).toEqual([]);
        expect(literalesDe('<span>—</span>')).toEqual([]);
    });
});
