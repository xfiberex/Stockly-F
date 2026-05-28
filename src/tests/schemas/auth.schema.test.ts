import {
    loginFormSchema,
    registerFormSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    updateProfileSchema,
    updatePasswordSchema,
} from "@/modules/auth/schemas/auth.schema";

describe("Auth Schemas — validación con Zod", () => {
    describe("loginFormSchema", () => {
        it("acepta email y contraseña válidos", () => {
            expect(loginFormSchema.safeParse({ email: "user@example.com", password: "secret" }).success).toBe(true);
        });
        it("rechaza email con formato inválido", () => {
            const result = loginFormSchema.safeParse({ email: "no-es-email", password: "secret" });
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].message).toBe("Email no válido");
        });
        it("rechaza email vacío", () => {
            expect(loginFormSchema.safeParse({ email: "", password: "secret" }).success).toBe(false);
        });
        it("rechaza contraseña vacía", () => {
            expect(loginFormSchema.safeParse({ email: "user@example.com", password: "" }).success).toBe(false);
        });
    });

    describe("registerFormSchema", () => {
        const valid = {
            name: "Juan García",
            email: "juan@example.com",
            password: "12345678",
            passwordConfirmation: "12345678",
        };

        it("acepta datos completos válidos", () => {
            expect(registerFormSchema.safeParse(valid).success).toBe(true);
        });
        it("rechaza nombre vacío", () => {
            expect(registerFormSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
        });
        it("rechaza contraseña menor a 8 caracteres", () => {
            const result = registerFormSchema.safeParse({
                ...valid,
                password: "short",
                passwordConfirmation: "short",
            });
            expect(result.success).toBe(false);
        });
        it("rechaza si las contraseñas no coinciden", () => {
            const result = registerFormSchema.safeParse({
                ...valid,
                passwordConfirmation: "diferente",
            });
            expect(result.success).toBe(false);
            const issue = result.error?.issues.find((i) => i.path[0] === "passwordConfirmation");
            expect(issue?.message).toBe("Las contraseñas no coinciden");
        });
        it("rechaza email inválido", () => {
            expect(registerFormSchema.safeParse({ ...valid, email: "mal" }).success).toBe(false);
        });
    });

    describe("forgotPasswordSchema", () => {
        it("acepta email válido", () => {
            expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
        });
        it("rechaza email inválido", () => {
            expect(forgotPasswordSchema.safeParse({ email: "not-email" }).success).toBe(false);
        });
        it("rechaza email vacío", () => {
            expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
        });
    });

    describe("resetPasswordSchema", () => {
        it("acepta contraseñas iguales de 8+ chars", () => {
            expect(
                resetPasswordSchema.safeParse({ password: "abcd1234", passwordConfirmation: "abcd1234" }).success,
            ).toBe(true);
        });
        it("rechaza si no coinciden", () => {
            expect(
                resetPasswordSchema.safeParse({ password: "abcd1234", passwordConfirmation: "diferente" }).success,
            ).toBe(false);
        });
        it("rechaza contraseña menor a 8 caracteres", () => {
            expect(
                resetPasswordSchema.safeParse({ password: "short", passwordConfirmation: "short" }).success,
            ).toBe(false);
        });
    });

    describe("updateProfileSchema", () => {
        it("acepta nombre y email válidos", () => {
            expect(
                updateProfileSchema.safeParse({ name: "Ana", email: "ana@example.com" }).success,
            ).toBe(true);
        });
        it("rechaza nombre vacío", () => {
            expect(updateProfileSchema.safeParse({ name: "", email: "a@b.com" }).success).toBe(false);
        });
        it("rechaza email inválido", () => {
            expect(updateProfileSchema.safeParse({ name: "Ana", email: "not-email" }).success).toBe(false);
        });
    });

    describe("updatePasswordSchema", () => {
        const valid = {
            currentPassword: "actual1234",
            password: "nueva1234",
            passwordConfirmation: "nueva1234",
        };
        it("acepta datos válidos", () => {
            expect(updatePasswordSchema.safeParse(valid).success).toBe(true);
        });
        it("rechaza contraseña actual vacía", () => {
            expect(updatePasswordSchema.safeParse({ ...valid, currentPassword: "" }).success).toBe(false);
        });
        it("rechaza si la nueva contraseña no coincide con la confirmación", () => {
            expect(
                updatePasswordSchema.safeParse({ ...valid, passwordConfirmation: "distinta" }).success,
            ).toBe(false);
        });
    });
});
