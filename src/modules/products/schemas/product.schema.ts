import { z } from "zod";

// Validación de categorías permitidas para los productos
export const VALID_CATEGORIES = [
  "Electrónica",
  "Periféricos",
  "Audio",
  "Accesorios",
  "Muebles",
  "Otros",
] as const;

// Esquemas de validación para creación y actualización de productos
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(200, "Máximo 200 caracteres"),
  description: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional(),
  price: z.coerce
    .number({ error: "El precio es obligatorio" })
    .min(0.01, "El precio debe ser mayor a 0"),
  stock: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "El stock no puede ser negativo")
    .optional(),
  category: z.enum(VALID_CATEGORIES, { error: "Selecciona una categoría válida" }),
  image: z.instanceof(File).optional(),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, "El nombre no puede estar vacío").max(200).optional(),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().min(0.01, "El precio debe ser mayor a 0").optional(),
  stock: z.coerce.number().int().min(0).optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  image: z.instanceof(File).optional(),
});

export type CreateProductFormData = z.infer<typeof createProductSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
