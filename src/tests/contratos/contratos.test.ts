import { ajusteSchema, productoSchema, ordenDeVentaSchema, paginadoSchema, segunContrato } from "./esquemas";
import { ajusteBooleano, productoDeCatalogo, ordenDeVentaEnviada } from "./fixtures";

// T2-24: 379 tests en verde no detectaron T0-03, T1-03 ni T1-05, porque cada lado se
// probaba contra su propia suposición del contrato. Estos esquemas describen la respuesta
// real del backend y los mocks compartidos se validan contra ellos **al importarse**.
//
// Lo que se comprueba aquí no es que los mocks estén bien —eso ya lo garantiza el import,
// que revienta si no lo están— sino que el mecanismo **detecta de verdad** las tres
// divergencias concretas que costaron esas tres tareas. Un guardián que no se prueba
// contra el fallo que debe cazar no es un guardián.

describe("Contrato con el backend (T2-24)", () => {
    it("los mocks compartidos cumplen el contrato", () => {
        // Redundante a propósito: si el import ya hubiera fallado, este archivo no
        // llegaría a ejecutarse. Sirve de recordatorio de dónde vive la garantía.
        expect(ajusteSchema.safeParse(ajusteBooleano).success).toBe(true);
        expect(productoSchema.safeParse(productoDeCatalogo).success).toBe(true);
        expect(ordenDeVentaSchema.safeParse(ordenDeVentaEnviada).success).toBe(true);
    });

    describe("caza las divergencias que ya costaron una tarea", () => {
        it("T1-05/T1-06: un ajuste booleano mockeado como cadena", () => {
            // Es el defecto literal: el interruptor se pintaba apagado con el ajuste
            // encendido porque `"false"` es una cadena verdadera.
            const roto = { ...ajusteBooleano, value: "false" as unknown as boolean, type: "boolean" as const };

            expect(ajusteSchema.safeParse(roto).success).toBe(false);
        });

        it("T1-03: etiquetas mockeadas como cadenas en vez de objetos", () => {
            const roto = { ...productoDeCatalogo, tags: ["Oferta"] as unknown as Product["tags"] };

            expect(productoSchema.safeParse(roto).success).toBe(false);
        });

        it("un listado mockeado sin el sobre `{ data, meta }`", () => {
            // El error más repetido al mockear: la lista va en `data.data`, no en `data`.
            const esquema = paginadoSchema(productoSchema);

            expect(esquema.safeParse([productoDeCatalogo]).success).toBe(false);
            expect(
                esquema.safeParse({
                    data: [productoDeCatalogo],
                    meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
                }).success,
            ).toBe(true);
        });

        it("un ítem de orden sin `productId` nulo explícito", () => {
            // Los ítems sin producto del catálogo llevan `productId: null`, no ausente:
            // de esa distinción depende el recuento de reposición de T2-42.
            const roto = {
                ...ordenDeVentaEnviada,
                items: [{ id: "i1", productName: "Suelto", quantity: 1, unitPrice: 10 }],
            };

            expect(ordenDeVentaSchema.safeParse(roto).success).toBe(false);
        });
    });

    it("`segunContrato` explica qué campo falla, no solo que falla", () => {
        // Un mensaje de «invalid_type» sin ruta obliga a comparar dos objetos a ojo.
        expect(() =>
            segunContrato(ajusteSchema, { ...ajusteBooleano, value: "false" } as never, "ajusteDePrueba"),
        ).toThrow(/ajusteDePrueba/);
    });
});

type Product = typeof productoDeCatalogo;
