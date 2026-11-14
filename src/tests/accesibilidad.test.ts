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

/**
 * Las aperturas de `<Button …>` y `<button …>` de un archivo, con sus props y su contenido.
 *
 * La apertura no se puede cortar en el primer `>`: las props llevan funciones flecha
 * (`onClick={() => remove(idx)}`) y ese `>` cerraría la etiqueta a mitad. Se cuenta la
 * profundidad de llaves y solo vale un `>` fuera de ellas.
 */
function botones(texto: string): Array<{ props: string; contenido: string }> {
    const encontrados: Array<{ props: string; contenido: string }> = [];
    const apertura = /<(Button|button)(?![A-Za-z])/g;

    for (const coincidencia of texto.matchAll(apertura)) {
        const etiqueta = coincidencia[1]!;
        let profundidad = 0;
        let i = coincidencia.index! + coincidencia[0].length;
        for (; i < texto.length; i++) {
            const caracter = texto[i];
            if (caracter === "{") profundidad++;
            else if (caracter === "}") profundidad--;
            else if (caracter === ">" && profundidad === 0) break;
        }
        const props = texto.slice(coincidencia.index! + coincidencia[0].length, i);
        if (props.endsWith("/")) continue;

        const cierre = texto.indexOf(`</${etiqueta}>`, i);
        encontrados.push({ props, contenido: texto.slice(i + 1, cierre) });
    }

    return encontrados;
}

describe("accesibilidad (AUD-018)", () => {
    it("ningún botón de solo icono se queda sin `aria-label`", () => {
        // La crítica del 2026-11-07 encontró papeleras y lápices con `title` a secas en
        // Catálogo, Proveedores y el formulario de compra. `title` no es un nombre fiable
        // —no llega con el teclado ni al tocar— y, repetido por fila, se anuncia igual en
        // todas: «Editar, botón» diez veces, sin decir de qué. El nombre tiene que decir
        // también **sobre qué** actúa (`Editar Periféricos`), y eso no lo comprueba esta
        // guardia, sino los tests de cada pantalla; aquí se exige que exista.
        //
        // «Solo icono» es que, quitando los `<…Icon … />` y los comentarios, no queda nada.
        // Un contenido condicional (`{abierto ? <XIcon/> : <BarsIcon/>}`) no cuenta: no
        // se puede saber desde el texto, y el falso positivo enseñaría a desactivar la guardia.
        const soloIcono = (contenido: string) =>
            !contenido
                .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
                .replace(/<[A-Z][A-Za-z]*Icon\b[^>]*\/>/g, "")
                .trim();

        const sinNombre = fuentes().flatMap(({ ruta, texto }) =>
            botones(texto)
                .filter(({ props, contenido }) => soloIcono(contenido) && !/\baria-label=/.test(props))
                .map(({ contenido }) => `${ruta}: ${contenido.trim().slice(0, 60)}`),
        );

        expect(sinNombre).toEqual([]);
    });

    it("el acento suave solo pinta iconos; el texto en verde va con el fuerte", () => {
        // `--color-accent` da 3,8:1 sobre blanco: vale para un borde o un icono (3:1), no
        // para texto (4,5:1). El nombre del cliente en Ventas y en Clientes iba en
        // `text-accent`, y la paleta ya tenía la respuesta —`accent-strong`, 5,5:1— desde
        // T2-35. `text-accent/…` con opacidad tampoco cuenta como fuerte.
        const enTexto = fuentes().flatMap(({ ruta, texto }) =>
            texto
                .split("\n")
                .filter((linea) => /(?<![-\w])text-accent(?![-\w])/.test(linea) && !/Icon\b/.test(linea))
                .map((linea) => `${ruta}: ${linea.trim()}`),
        );

        expect(enTexto).toEqual([]);
    });
});
