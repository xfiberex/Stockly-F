import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { digitoDeControlGtin } from "../src/shared/contratos/api.generated";

/**
 * T5-08 — lo que hace falta para que el E2E **imprima** una etiqueta y la vuelva a leer.
 *
 * El PDF lo genera el backend de verdad y lo descarga la interfaz; aquí se rasteriza cada
 * página a PNG con pdf.js —en Node, sobre `@napi-rs/canvas`— y ese PNG se le da al escáner de
 * la aplicación como la foto de la etiqueta. Es el criterio de la ficha tal cual: lo impreso
 * se lee con el mismo escáner. A 4× son 288 ppp: menos que una impresora de oficina o una
 * térmica de 300, y más que una de 203.
 */

const require = createRequire(import.meta.url);
const FUENTES = join(dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + "/";

export async function paginasComoPng(ruta: string, escala = 4): Promise<Buffer[]> {
    const carga = getDocument({ data: new Uint8Array(readFileSync(ruta)), standardFontDataUrl: FUENTES });
    const pdf = await carga.promise;
    const paginas: Buffer[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
        const pagina = await pdf.getPage(n);
        const viewport = pagina.getViewport({ scale: escala });
        const { canvas } = pdf.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await pagina.render({ canvas, viewport }).promise;
        paginas.push((canvas as unknown as { toBuffer(tipo: string): Buffer }).toBuffer("image/png"));
    }
    await carga.destroy();
    return paginas;
}

/**
 * T6-07 — lo que dice un PDF, página a página, como texto corrido. Es lo que lee quien recibe el
 * comprobante de venta: el E2E lo descarga por la interfaz y comprueba aquí que el papel dice lo
 * mismo que la pantalla.
 */
export async function textoDelPdf(ruta: string): Promise<string[]> {
    const carga = getDocument({ data: new Uint8Array(readFileSync(ruta)), standardFontDataUrl: FUENTES });
    const pdf = await carga.promise;
    const paginas: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
        const contenido = await (await pdf.getPage(n)).getTextContent();
        paginas.push(contenido.items.map((item) => ("str" in item ? item.str : "")).filter((t) => t.trim()).join(" "));
    }
    await carga.destroy();
    return paginas;
}

let contador = 0;

/**
 * Un EAN-13 válido que no se repite entre ejecuciones ni entre los dos proyectos, que corren
 * a la vez. Empieza por 29: prefijo de uso interno de GS1, como los del seed (200…).
 */
export function eanDePrueba(): string {
    const azar = (Math.floor(Math.random() * 1000) + contador++) % 1000;
    const cuerpo = `29${String(Date.now()).slice(-7)}${String(azar).padStart(3, "0")}`;
    return cuerpo + digitoDeControlGtin(cuerpo);
}
