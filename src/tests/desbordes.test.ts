import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// T2-45: en Chrome de Android, un contenedor con scroll horizontal ensancha el
// *viewport de diseño* con el ancho de su contenido aunque lo recorte visualmente.
// Todo lo que sea `position: fixed` —los modales— se dimensiona contra ese viewport
// ensanchado y acaba midiendo más que la pantalla, con la mitad derecha (donde vive
// el botón primario) fuera del borde. `contain: paint` lo impide.
//
// Medido con Playwright en Pixel 5 (393 px): con la tabla de productos en pantalla,
// un `position: fixed; inset: 0` medía **663 px**; con `contain: paint` en el
// scroller, **393**. No basta con `overflow-x: hidden` en el elemento raíz, que se
// probó y no cambia nada.

const RAIZ = join(__dirname, "..");

function archivosTsx(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
        const ruta = join(dir, entrada);
        if (statSync(ruta).isDirectory()) return entrada === "tests" ? [] : archivosTsx(ruta);
        return ruta.endsWith(".tsx") ? [ruta] : [];
    });
}

/** Los `className` de un archivo, uno por atributo. */
function clases(contenido: string): string[] {
    return [...contenido.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
}

describe("Desbordamiento horizontal en móvil (T2-45)", () => {
    const archivos = archivosTsx(RAIZ);

    it("encuentra los componentes con scroll horizontal", () => {
        const conScroll = archivos.filter((f) =>
            clases(readFileSync(f, "utf8")).some((c) => c.includes("overflow-x-auto")),
        );
        // Si esta cifra cambia, es que hay un scroller nuevo: pásalo por la comprobación
        // de abajo antes de subir el número.
        expect(conScroll.length).toBeGreaterThanOrEqual(4);
    });

    it("todo scroller horizontal lleva `contain-paint`", () => {
        const sinContencion: string[] = [];

        for (const archivo of archivos) {
            for (const clase of clases(readFileSync(archivo, "utf8"))) {
                if (clase.includes("overflow-x-auto") && !clase.includes("contain-paint")) {
                    sinContencion.push(`${archivo.replace(RAIZ, "src")} → "${clase}"`);
                }
            }
        }

        expect(
            sinContencion,
            `Estos contenedores con scroll horizontal ensancharían el viewport de diseño en móvil:\n${sinContencion.join("\n")}`,
        ).toEqual([]);
    });
});
