import { z } from "zod";
import { motivoCodigoDeBarrasInvalido } from "@/shared/contratos";
import type { Clave } from "@/shared/i18n/traducir";

// T4-04 — los mensajes son **claves del catálogo**, no frases; los traduce el campo con
// `te()`. Ver la cabecera de `auth.schema.ts`, donde está el porqué completo.
const mensaje = (clave: Clave): string => clave;

// Los <select> de categoría/marca/proveedor emiten "" cuando se elige "Sin …".
// Se normaliza "" → undefined para que esas opciones (válidas) no fallen la
// validación de UUID.
const uuidOptional = z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().uuid(mensaje("validacion.uuid")).optional(),
);

// T5-01 — el coste es opcional y un campo numérico vacío llega como "": sin el
// `preprocess`, `z.coerce` lo convertiría en 0 y un producto sin coste pasaría a costar cero,
// que no es lo mismo que no saberlo.
const costeOpcional = z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().min(0, mensaje("validacion.noNegativo")).optional(),
);

// T5-08 — la regla es la del contrato, la misma que aplica el backend: aquí solo se le pone
// la clave del mensaje. El vacío vale: es «sin código».
const MENSAJE_CODIGO: Record<NonNullable<ReturnType<typeof motivoCodigoDeBarrasInvalido>>, Clave> = {
    largo: "validacion.codigoDeBarrasLargo",
    caracteres: "validacion.codigoDeBarrasCaracteres",
    digitoDeControl: "validacion.codigoDeBarrasControl",
};
const codigoDeBarras = z.string().optional().superRefine((valor, ctx) => {
    const codigo = valor?.trim() ?? "";
    const motivo = codigo === "" ? null : motivoCodigoDeBarrasInvalido(codigo);
    if (motivo) ctx.addIssue({ code: "custom", message: mensaje(MENSAJE_CODIGO[motivo]) });
});

export const createProductSchema = z.object({
    name: z.string().min(1, mensaje("validacion.nombreRequerido")).max(200, mensaje("validacion.maximo200")),
    description: z.string().max(1000, mensaje("validacion.maximo1000")).optional(),
    sku: z.string().max(100, mensaje("validacion.maximo100")).optional(),
    barcode: codigoDeBarras,
    price: z.coerce
        .number({ error: mensaje("validacion.precioRequerido") })
        .min(0.01, mensaje("validacion.precioMayorQueCero")),
    costPrice: costeOpcional,
    stock: z.coerce
        .number()
        .int(mensaje("validacion.numeroEntero"))
        .min(0, mensaje("validacion.stockNoNegativo"))
        .optional(),
    minStock: z.coerce
        .number()
        .int(mensaje("validacion.numeroEntero"))
        .min(0, mensaje("validacion.noNegativo"))
        .optional(),
    categoryId: uuidOptional,
    brandId: uuidOptional,
    supplierId: uuidOptional,
    image: z.instanceof(File).optional(),
});

export const updateProductSchema = z.object({
    name: z.string().min(1, mensaje("validacion.nombreVacio")).max(200).optional(),
    description: z.string().max(1000).optional(),
    sku: z.string().max(100).optional(),
    barcode: codigoDeBarras,
    price: z.coerce.number().min(0.01, mensaje("validacion.precioMayorQueCero")).optional(),
    costPrice: costeOpcional,
    stock: z.coerce.number().int().min(0).optional(),
    minStock: z.coerce.number().int().min(0).optional(),
    categoryId: uuidOptional,
    brandId: uuidOptional,
    supplierId: uuidOptional,
    image: z.instanceof(File).optional(),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;
