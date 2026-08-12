import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guardias de accesibilidad sobre el código fuente (T4-09).
 *
 * Salen de una auditoría de Lighthouse sobre el **build de producción tras nginx**, no del
 * análisis del código: los tres fallos que encontró comparten la misma forma —la aplicación
 * funciona, se ve bien y solo falla para quien no la mira— y ninguno de ellos habría hecho
 * fallar una prueba de comportamiento.
 *
 * Se comprueban aquí, sobre el texto de los componentes, y no con axe sobre el DOM
 * renderizado, porque el fallo se comete al escribir un `<Select>` nuevo, no al ejecutarlo:
 * lo que hace falta es que salte en `pnpm verify` el día que alguien lo repita.
 */

const RAIZ = join(__dirname, "..");

/** Igual que en `desbordes.test.ts`: se recorre `src/**` y se deja fuera `src/tests`. */
function archivosTsx(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return entrada === "tests" ? [] : archivosTsx(ruta);
        return ruta.endsWith(".tsx") ? [ruta] : [];
    });
}

function fuentes(): Array<{ ruta: string; texto: string }> {
    return archivosTsx(RAIZ).map((ruta) => ({
        ruta: ruta.slice(RAIZ.length + 1).replace(/\\/g, "/"),
        texto: readFileSync(ruta, "utf8"),
    }));
}

describe("accesibilidad (T4-09)", () => {
    it("ningún <Select> se queda sin nombre accesible", () => {
        // Lighthouse: `select-name`. **Ocho desplegables en cuatro pantallas** —filtros de
        // productos, auditoría, movimientos y usuarios— no tenían ni `label` ni
        // `aria-label`. Se leían como «cuadro combinado» y nada más: el texto visible es la
        // opción elegida, que dice el *valor*, no de qué es el filtro.
        const sinNombre: string[] = [];

        for (const { ruta, texto } of fuentes()) {
            // Se corta en `>` para no mirar dentro del cuerpo del componente. `<Selector…`
            // no cuenta: son los envoltorios propios de tema e idioma, que ponen su etiqueta.
            for (const apertura of texto.split(/<Select(?![a-zA-Z])/).slice(1)) {
                const props = apertura.slice(0, apertura.search(/\/?>/));
                if (!/\blabel=/.test(props) && !/\baria-label=/.test(props)) sinNombre.push(ruta);
            }
        }

        expect(sinNombre).toEqual([]);
    });

    it("las pantallas fuera del armazón llevan landmark <main>", () => {
        // Lighthouse: `landmark-one-main`, sobre el **login**, que es la primera pantalla
        // del producto. Las siete pantallas sin sesión no pasan por `App.tsx`, así que no
        // heredaban su `<main>` y quedaban sin ningún landmark.
        const sinMain = fuentes()
            .filter(({ texto }) => /CLASES_MARCO_CENTRADO/.test(texto))
            .filter(({ texto }) => !/<main/.test(texto))
            .map(({ ruta }) => ruta);

        expect(sinMain).toEqual([]);
    });

    it("ningún enlace dentro de un párrafo se distingue solo por color", () => {
        // Lighthouse: `link-in-text-block`. Con `hover:underline` a secas, lo único que
        // separa el enlace del texto que lo rodea es el color (WCAG 1.4.1) — la misma regla
        // por la que ningún estado de este proyecto se comunica solo con color.
        // Se mira **dentro de cada `<p>…</p>`**, no en una ventana de caracteres: la
        // primera versión de esta guardia buscaba un `<Link>` a menos de 400 caracteres de
        // un `<p>` y se saltaba el cierre, así que señalaba cinco pantallas donde el enlace
        // va suelto en un `div` — y ahí la regla no aplica, porque no hay texto alrededor
        // del que distinguirlo.
        const parrafos = /<p\b[^>]*>([\s\S]*?)<\/p>/g;

        // **Y tiene que quedar texto alrededor.** Un `<p>` cuyo único hijo es el enlace no
        // es un bloque de texto: no hay nada de lo que distinguirlo, y Lighthouse tampoco
        // lo marca. Sin esta condición la guardia señalaba «Volver al inicio de sesión» en
        // dos pantallas, que está bien como está.
        const soloElEnlace = (dentro: string) =>
            !dentro
                .replace(/<Link[\s\S]*?<\/Link>/g, "")
                .replace(/\{" "\}/g, "")
                .trim();

        const infractores = fuentes()
            .filter(({ texto }) =>
                Array.from(texto.matchAll(parrafos)).some(
                    ([, dentro]) =>
                        /<Link[^>]*className="[^"]*hover:underline[^"]*"/.test(dentro) && !soloElEnlace(dentro),
                ),
            )
            .map(({ ruta }) => ruta);

        expect(infractores).toEqual([]);
    });

    it("ningún <Button> vive dentro de un <Link>", () => {
        // T2-14 quitó este patrón de la tabla de productos y **volvió** en el modal de
        // detalle, que es lo que lo convierte en regla en vez de en arreglo. Un `<button>`
        // dentro de un `<a>` es HTML inválido y deja **dos paradas de tabulación para una
        // sola acción**; el navegador, además, no garantiza qué gana al pulsar.
        //
        // Lo que hay que usar es `clasesDeBoton()` en el propio `<a>`: se ve igual, es una
        // sola parada y no copia la cadena de clases.
        // La apertura se cierra con `[^/]>` a propósito: sin eso, un `<Link … />` sin hijos
        // abriría la búsqueda y la cerraría en el `</Link>` de otro enlace más abajo,
        // señalando un archivo donde el anidamiento no existe.
        const enlaces = /<Link\b[^>]*[^/]>([\s\S]*?)<\/Link>/g;

        const infractores = fuentes()
            .filter(({ texto }) => Array.from(texto.matchAll(enlaces)).some(([, dentro]) => /<Button\b/.test(dentro)))
            .map(({ ruta }) => ruta);

        expect(infractores, "Usa clasesDeBoton() en el <Link>, no un <Button> dentro").toEqual([]);
    });
});
