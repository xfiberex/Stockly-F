import { createProductSchema, updateProductSchema } from "@/modules/products/schemas/product.schema";

describe("Product Schemas — validación con Zod", () => {
    describe("createProductSchema", () => {
        const valid = {
            name: 'Monitor LG 27"',
            price: 299.99,
        };

        it("acepta los campos mínimos requeridos (nombre + precio)", () => {
            expect(createProductSchema.safeParse(valid).success).toBe(true);
        });
        it("acepta todos los campos opcionales", () => {
            expect(
                createProductSchema.safeParse({ ...valid, description: "Descripción", stock: 10 }).success,
            ).toBe(true);
        });
        it("rechaza nombre vacío", () => {
            expect(createProductSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
        });
        it("rechaza nombre con más de 200 caracteres", () => {
            expect(createProductSchema.safeParse({ ...valid, name: "a".repeat(201) }).success).toBe(false);
        });
        it("acepta nombre exactamente de 200 caracteres", () => {
            expect(createProductSchema.safeParse({ ...valid, name: "a".repeat(200) }).success).toBe(true);
        });
        it("rechaza precio igual a 0", () => {
            expect(createProductSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
        });
        it("rechaza precio negativo", () => {
            expect(createProductSchema.safeParse({ ...valid, price: -10 }).success).toBe(false);
        });
        it("rechaza stock negativo", () => {
            expect(createProductSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
        });
        it("acepta stock = 0", () => {
            expect(createProductSchema.safeParse({ ...valid, stock: 0 }).success).toBe(true);
        });
        it("acepta categoryId como UUID válido", () => {
            expect(
                createProductSchema.safeParse({ ...valid, categoryId: "550e8400-e29b-41d4-a716-446655440000" }).success,
            ).toBe(true);
        });
        it("rechaza categoryId con formato no UUID", () => {
            expect(createProductSchema.safeParse({ ...valid, categoryId: "no-es-uuid" }).success).toBe(false);
        });
        it("acepta categoryId ausente (es opcional)", () => {
            expect(createProductSchema.safeParse(valid).success).toBe(true);
        });
        it("coerce strings numéricos a número para price", () => {
            expect(createProductSchema.safeParse({ ...valid, price: "150" }).success).toBe(true);
        });
    });

    describe("updateProductSchema", () => {
        it("acepta objeto vacío (todos los campos son opcionales)", () => {
            expect(updateProductSchema.safeParse({}).success).toBe(true);
        });
        it("acepta actualización parcial de nombre", () => {
            expect(updateProductSchema.safeParse({ name: "Nuevo nombre" }).success).toBe(true);
        });
        it("rechaza precio ≤ 0 cuando se provee", () => {
            expect(updateProductSchema.safeParse({ price: 0 }).success).toBe(false);
        });
        it("rechaza stock negativo cuando se provee", () => {
            expect(updateProductSchema.safeParse({ stock: -5 }).success).toBe(false);
        });
        it("rechaza categoryId inválido cuando se provee", () => {
            expect(updateProductSchema.safeParse({ categoryId: "no-es-uuid" }).success).toBe(false);
        });
        it("acepta categoryId como UUID válido cuando se provee", () => {
            expect(
                updateProductSchema.safeParse({ categoryId: "550e8400-e29b-41d4-a716-446655440000" }).success,
            ).toBe(true);
        });
    });
});
