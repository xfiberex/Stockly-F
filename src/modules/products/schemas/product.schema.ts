import { z } from "zod";
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

export const createProductSchema = z.object({
    name: z.string().min(1, mensaje("validacion.nombreRequerido")).max(200, mensaje("validacion.maximo200")),
    description: z.string().max(1000, mensaje("validacion.maximo1000")).optional(),
    sku: z.string().max(100, mensaje("validacion.maximo100")).optional(),
    price: z.coerce
        .number({ error: mensaje("validacion.precioRequerido") })
        .min(0.01, mensaje("validacion.precioMayorQueCero")),
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
    price: z.coerce.number().min(0.01, mensaje("validacion.precioMayorQueCero")).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    minStock: z.coerce.number().int().min(0).optional(),
    categoryId: uuidOptional,
    brandId: uuidOptional,
    supplierId: uuidOptional,
    image: z.instanceof(File).optional(),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
