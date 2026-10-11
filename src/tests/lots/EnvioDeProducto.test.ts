import { updateProduct } from "@/modules/products/api/product.api";

/**
 * T5-15 — desmarcar «lleva lotes» tiene que **llegar**. El producto viaja como
 * `multipart/form-data`, y hasta ahora todo booleano a `false` se quedaba fuera: para
 * `removeImage` era lo correcto —el backend lee cualquier valor como «quítala»—, y para
 * `tracksLots` significaría que una vez marcado no se puede desmarcar.
 */

const enviado = vi.hoisted(() => ({ cuerpo: null as FormData | null }));

vi.mock("@/shared/api/axios", () => ({
    default: {
        put: (_ruta: string, cuerpo: FormData) => {
            enviado.cuerpo = cuerpo;
            return Promise.resolve({ data: { data: {} } });
        },
    },
}));

describe("el envío de un producto", () => {
    it("`tracksLots: false` viaja como «false»; `removeImage: false` no viaja", async () => {
        await updateProduct({ id: "p1", dto: { name: "Yogur", tracksLots: false, removeImage: false } });

        expect(enviado.cuerpo!.get("tracksLots")).toBe("false");
        expect(enviado.cuerpo!.has("removeImage")).toBe(false);
    });

    it("`tracksLots: true` y `removeImage: true` viajan los dos", async () => {
        await updateProduct({ id: "p1", dto: { tracksLots: true, removeImage: true } });

        expect(enviado.cuerpo!.get("tracksLots")).toBe("true");
        expect(enviado.cuerpo!.get("removeImage")).toBe("true");
    });
});
