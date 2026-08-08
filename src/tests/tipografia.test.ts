import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * T2-41 — la escala tipográfica es explícita y cerrada.
 *
 * `index.css` borra los espacios de nombres `--text-*` y `--font-weight-*` de
 * Tailwind y declara solo los que la interfaz usa. El riesgo de hacerlo así es
 * silencioso: una clase no declarada no da error, simplemente no pinta nada.
 * Este test convierte ese silencio en un fallo — y de paso impide que la escala
 * vuelva a crecer sola.
 */

const RAIZ = process.cwd();

/**
 * Sin esto el test se acusa a sí mismo: los comentarios que explican *por qué* se
 * fueron `text-6xl` y `font-black` los nombran, y un escaneo en crudo los cuenta
 * como uso. Se mira el código, no lo que el código dice de sí mismo.
 */
function sinComentarios(fuente: string): string {
    return fuente
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:"'\w])\/\/.*$/gm, "$1");
}

const CSS = sinComentarios(readFileSync(path.join(RAIZ, "src/index.css"), "utf8"));

const TAMANOS = ["xs", "sm", "base", "xl", "2xl"];
const PESOS = { normal: 400, medium: 500, semibold: 600, bold: 700 };

function* archivos(dir: string): Generator<string> {
    for (const entrada of readdirSync(dir)) {
        const completo = path.join(dir, entrada);
        if (statSync(completo).isDirectory()) {
            if (entrada === "tests") continue;
            yield* archivos(completo);
        } else if (/\.tsx?$/.test(entrada)) {
            yield completo;
        }
    }
}

const FUENTES = [...archivos(path.join(RAIZ, "src"))].map((f) => ({
    ruta: path.relative(RAIZ, f).replace(/\\/g, "/"),
    texto: sinComentarios(readFileSync(f, "utf8")),
}));

describe("Escala tipográfica (T2-41)", () => {
    it("los espacios de nombres de Tailwind están borrados antes de declarar los propios", () => {
        expect(CSS).toMatch(/--text-\*:\s*initial/);
        expect(CSS).toMatch(/--font-weight-\*:\s*initial/);
    });

    it.each(TAMANOS)("el tamaño %s está declarado con su altura de línea", (tam) => {
        expect(CSS).toMatch(new RegExp(`--text-${tam.replace("2", "2")}:\\s*[\\d.]+rem`));
        expect(CSS).toMatch(new RegExp(`--text-${tam}--line-height:\\s*[\\d.]+rem`));
    });

    it("no se usa ningún tamaño fuera de la escala declarada", () => {
        const infracciones: string[] = [];
        for (const { ruta, texto } of FUENTES) {
            for (const m of texto.matchAll(/\btext-((?:xs|sm|base|lg|\d?xl)|\[[^\]]*\])(?![a-z-])/g)) {
                if (!TAMANOS.includes(m[1])) infracciones.push(`${ruta}: text-${m[1]}`);
            }
        }
        expect(infracciones).toEqual([]);
    });

    it("no se usa ningún peso fuera de los cuatro declarados", () => {
        const infracciones: string[] = [];
        for (const { ruta, texto } of FUENTES) {
            for (const m of texto.matchAll(/\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g)) {
                if (!(m[1] in PESOS)) infracciones.push(`${ruta}: font-${m[1]}`);
            }
        }
        expect(infracciones).toEqual([]);
    });

    // Las dos direcciones del criterio: ni un peso usado sin cargar —que el
    // navegador fingiría engordando otro— ni uno cargado que nadie use, que son
    // kilobytes de fuente por nada.
    it("los pesos cargados y los pesos declarados son los mismos", () => {
        const cargados = [...CSS.matchAll(/@fontsource\/inter\/latin-(\d{3})\.css/g)].map((m) => Number(m[1]));
        expect(cargados.sort()).toEqual(Object.values(PESOS).sort());

        for (const [nombre, valor] of Object.entries(PESOS)) {
            expect(CSS, `falta --font-weight-${nombre}`).toMatch(
                new RegExp(`--font-weight-${nombre}:\\s*${valor}`),
            );
        }
    });

    it("solo se carga el subconjunto latino, no los siete de cada peso", () => {
        expect(CSS).not.toMatch(/@fontsource\/inter\/\d{3}\.css/);
    });
});
