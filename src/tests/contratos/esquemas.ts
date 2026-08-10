import { z } from "zod";

/**
 * T2-24 — la forma **real** de las respuestas del backend, escrita en Zod.
 *
 * Es la segunda línea de defensa contra la clase de fallo que produjo T0-03, T1-03 y
 * T1-05: los tests del frontend pasaban en verde contra mocks que no se parecían a lo
 * que devuelve la API, así que 379 pruebas no detectaron tres defectos funcionales. El
 * caso canónico es `SettingsPage`, que mockeaba `value` como la cadena `"false"` cuando
 * el backend responde el boolean `false` —el interruptor se pintaba apagado con el
 * ajuste encendido, y ningún test se enteró—.
 *
 * Estos esquemas no validan datos en producción: **validan los mocks**. Cada campo se
 * corresponde con lo que emite el backend, y la referencia está anotada al lado para que
 * comprobarlo no exija adivinar.
 */

const camposDeAjuste = { key: z.string(), label: z.string(), description: z.string() };

/**
 * `settings.service.ts` convierte el valor según el `type` del catálogo antes de
 * responder, así que el tipo de `value` **depende de `type`**: es una unión discriminada,
 * no un `value: boolean | number | string`.
 *
 * La diferencia no es teórica. Con la versión laxa, `{ type: "boolean", value: "false" }`
 * pasaba la validación — y ese es exactamente el mock que ocultó T1-06, porque `"false"`
 * es una cadena verdadera y el interruptor se pintaba apagado con el ajuste encendido.
 * Un contrato que acepta el defecto que debe cazar no sirve de nada.
 */
export const ajusteSchema = z.discriminatedUnion("type", [
    z.object({ ...camposDeAjuste, type: z.literal("boolean"), value: z.boolean() }),
    z.object({ ...camposDeAjuste, type: z.literal("number"), value: z.number() }),
    z.object({ ...camposDeAjuste, type: z.literal("string"), value: z.string() }),
]);

/** `NamedRef` del spec: categoría, marca y proveedor se leen como objeto, no como cadena. */
const referenciaSchema = z.object({ id: z.string(), name: z.string() }).nullable();

/**
 * `PRODUCT_INCLUDE` del backend. Dos trampas conocidas van explícitas:
 * `price` llega como **cadena** (es `Decimal` en Prisma) y `tags` es un array de objetos,
 * no de cadenas — que es exactamente lo que el validador descartaba en silencio (T1-03).
 */
export const productoSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    sku: z.string().nullable().optional(),
    price: z.union([z.string(), z.number()]),
    stock: z.number(),
    minStock: z.number(),
    category: referenciaSchema.optional(),
    brand: referenciaSchema.optional(),
    supplier: referenciaSchema.optional(),
    tags: z.array(z.object({ id: z.string(), name: z.string(), color: z.string().nullable().optional() })),
    imageUrl: z.string().nullable().optional(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

const itemDeOrdenSchema = z.object({
    id: z.string(),
    productId: z.string().nullable(),
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.union([z.string(), z.number()]),
});

/** `ORDER_INCLUDE` de `sale-orders.service.ts`. */
export const ordenDeVentaSchema = z.object({
    id: z.string(),
    status: z.enum(["PENDING", "SHIPPED", "CANCELLED"]),
    customerName: z.string().nullable(),
    customerEmail: z.string().nullable(),
    customerPhone: z.string().nullable(),
    notes: z.string().nullable(),
    items: z.array(itemDeOrdenSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
});

/**
 * El sobre de los listados paginados. Está aquí porque es la forma que más se equivoca
 * al mockear: la lista va en `data.data`, **no** en `data`.
 */
export const paginadoSchema = <T extends z.ZodTypeAny>(elemento: T) =>
    z.object({
        data: z.array(elemento),
        meta: z.object({
            total: z.number(),
            page: z.number(),
            limit: z.number(),
            totalPages: z.number(),
        }),
    });

/**
 * Valida un mock contra su contrato y **revienta al importarlo** si no encaja.
 *
 * Se usa en el módulo de fixtures, no dentro de un `it`: así cualquier test que use un
 * mock desalineado falla, sin depender de que alguien se acuerde de comprobarlo.
 */
export function segunContrato<T>(esquema: z.ZodType<T>, valor: T, nombre: string): T {
    const resultado = esquema.safeParse(valor);
    if (!resultado.success) {
        throw new Error(
            `El mock «${nombre}» no coincide con la respuesta real del backend:\n` +
                JSON.stringify(resultado.error.issues, null, 2),
        );
    }
    return valor;
}
