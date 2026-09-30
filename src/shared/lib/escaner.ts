/**
 * T5-08 — leer un código de barras de la cámara o de una foto.
 *
 * `BarcodeDetector` es nativo en Chrome de Android y no existe en Firefox ni en Safari de
 * escritorio. Donde lo hay, se usa: no descarga nada y va por el hardware. Donde no, entra
 * `barcode-detector`, que implementa la misma API sobre ZXing compilado a WebAssembly.
 *
 * **Todo se carga bajo demanda.** Ni la librería ni su `.wasm` (~1 MB) entran en el primer
 * arranque: los trae el primer escaneo, y solo si el navegador no tiene lector propio.
 *
 * **El `.wasm` lo servimos nosotros.** Por defecto la librería lo baja de jsDelivr, lo que
 * haría que escanear dependiese de un tercero y de que la red de la tienda lo deje pasar.
 * `?url` hace que Vite lo copie al build con hash y nos dé su ruta.
 */

import type { BarcodeFormat } from "barcode-detector/ponyfill";

/** Lo que se busca en la imagen: los de producto (EAN/UPC), los de almacén y QR. */
export const FORMATOS_DE_CODIGO: BarcodeFormat[] = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code"];

/** Los dos que tiene que leer para servir: los de las etiquetas que imprime Stockly. */
const IMPRESCINDIBLES: BarcodeFormat[] = ["ean_13", "code_128"];

interface Detector {
    detect(fuente: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
}

interface ConstructorDeDetector {
    new (opciones: { formats: BarcodeFormat[] }): Detector;
    getSupportedFormats(): Promise<string[]>;
}

export interface Lector {
    /** El primer código que haya en la imagen, o `null` si no hay ninguno. */
    detectar(fuente: ImageBitmapSource): Promise<string | null>;
}

async function detectorNativo(): Promise<Detector | null> {
    const Nativo = (globalThis as { BarcodeDetector?: ConstructorDeDetector }).BarcodeDetector;
    if (!Nativo) return null;
    try {
        const soportados = await Nativo.getSupportedFormats();
        // Hay navegadores con la clase y sin formatos: en Chrome de escritorio fuera de macOS,
        // `getSupportedFormats()` devuelve una lista vacía.
        if (!IMPRESCINDIBLES.every((f) => soportados.includes(f))) return null;
        return new Nativo({ formats: FORMATOS_DE_CODIGO.filter((f) => soportados.includes(f)) });
    } catch {
        return null;
    }
}

async function detectorZxing(): Promise<Detector> {
    const [{ BarcodeDetector, prepareZXingModule }, { default: urlDelWasm }] = await Promise.all([
        import("barcode-detector/ponyfill"),
        import("zxing-wasm/reader/zxing_reader.wasm?url"),
    ]);
    prepareZXingModule({
        overrides: { locateFile: (ruta: string, prefijo: string) => (ruta.endsWith(".wasm") ? urlDelWasm : prefijo + ruta) },
    });
    return new BarcodeDetector({ formats: FORMATOS_DE_CODIGO });
}

let lector: Promise<Lector> | null = null;

/**
 * El lector, creado una vez. Si falla la carga —sin red a mitad de la descarga— se olvida el
 * intento, para que el siguiente escaneo vuelva a probar en vez de heredar el error.
 */
export function obtenerLector(): Promise<Lector> {
    lector ??= (async () => {
        const detector = (await detectorNativo()) ?? (await detectorZxing());
        return {
            async detectar(fuente) {
                const [primero] = await detector.detect(fuente);
                return primero?.rawValue.trim() || null;
            },
        };
    })();
    lector.catch(() => {
        lector = null;
    });
    return lector;
}
