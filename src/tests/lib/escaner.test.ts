import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * T5-08 — qué lector se usa. El nativo cuando existe **y lee lo que imprimimos**; si no,
 * `barcode-detector` con el `.wasm` servido por nosotros, no por jsDelivr.
 */

const detectarZxing = vi.fn();
const prepareZXingModule = vi.fn();
const construidoZxing = vi.fn();

vi.mock("barcode-detector/ponyfill", () => ({
    prepareZXingModule,
    BarcodeDetector: class {
        constructor(opciones: unknown) {
            construidoZxing(opciones);
        }
        detect = detectarZxing;
    },
}));
vi.mock("zxing-wasm/reader/zxing_reader.wasm?url", () => ({ default: "/assets/zxing_reader-abc123.wasm" }));

function nativo(formatos: string[]) {
    const detect = vi.fn().mockResolvedValue([{ rawValue: " 4006381333931 " }]);
    const Clase = Object.assign(
        class {
            detect = detect;
        },
        { getSupportedFormats: vi.fn().mockResolvedValue(formatos) },
    );
    vi.stubGlobal("BarcodeDetector", Clase);
    return detect;
}

async function lectorNuevo() {
    // El lector se crea una vez por módulo: cada caso necesita el suyo.
    vi.resetModules();
    const { obtenerLector } = await import("@/shared/lib/escaner");
    return obtenerLector;
}

beforeEach(() => {
    detectarZxing.mockReset().mockResolvedValue([{ rawValue: "PER-LOG" }]);
    prepareZXingModule.mockReset();
    construidoZxing.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("El lector de códigos (T5-08)", () => {
    it("con un BarcodeDetector nativo que lee EAN-13 y Code 128, usa ese y no descarga nada", async () => {
        const detect = nativo(["ean_13", "code_128", "qr_code"]);

        const lector = await (await lectorNuevo())();

        await expect(lector.detectar({} as ImageBitmap)).resolves.toBe("4006381333931");
        expect(detect).toHaveBeenCalled();
        expect(construidoZxing).not.toHaveBeenCalled();
    });

    it("si el nativo existe pero no lee lo que imprimimos —Chrome de escritorio—, usa ZXing", async () => {
        nativo([]);

        const lector = await (await lectorNuevo())();

        await expect(lector.detectar({} as ImageBitmap)).resolves.toBe("PER-LOG");
        expect(construidoZxing).toHaveBeenCalledWith({ formats: expect.arrayContaining(["ean_13", "code_128"]) });
    });

    it("el .wasm se pide a nuestro propio servidor", async () => {
        await (await lectorNuevo())();

        const { locateFile } = prepareZXingModule.mock.calls[0]![0].overrides;
        expect(locateFile("zxing_reader.wasm", "https://fastly.jsdelivr.net/")).toBe("/assets/zxing_reader-abc123.wasm");
    });

    it("sin código en la imagen devuelve null", async () => {
        detectarZxing.mockResolvedValue([]);

        const lector = await (await lectorNuevo())();

        await expect(lector.detectar({} as ImageBitmap)).resolves.toBeNull();
    });

    it("una carga fallida no se queda guardada: el siguiente intento vuelve a probar", async () => {
        const obtenerLector = await lectorNuevo();
        prepareZXingModule.mockImplementationOnce(() => {
            throw new Error("sin red");
        });
        await expect(obtenerLector()).rejects.toThrow("sin red");

        await expect(obtenerLector()).resolves.toBeDefined();
        expect(prepareZXingModule).toHaveBeenCalledTimes(2);
    });
});

describe("El escáner no viaja en el arranque (T5-08)", () => {
    const RAIZ = join(__dirname, "../..");
    const fuentes = (dir: string): string[] =>
        readdirSync(dir).flatMap((entrada) => {
            const ruta = join(dir, entrada);
            if (statSync(ruta).isDirectory()) return entrada === "tests" ? [] : fuentes(ruta);
            return /\.tsx?$/.test(ruta) ? [ruta] : [];
        });

    it("nadie importa barcode-detector ni zxing-wasm de forma estática: solo `escaner.ts`, bajo demanda", () => {
        // Un `import` estático los metería en el trozo de quien lo hace, que puede ser el del
        // arranque. `vite.config.ts` los separa en `vendor-escaner`, pero eso no sirve de nada
        // si algo los pide antes de tiempo. Los `import type` no generan código.
        const culpables = fuentes(RAIZ).filter((f) =>
            /^import (?!type\b)[^;]*from "(barcode-detector|zxing-wasm)/m.test(readFileSync(f, "utf8")),
        );

        expect(culpables).toEqual([]);
    });
});
