import { z } from "zod";
import type { Clave } from "@/shared/i18n/traducir";
import { idiomaSchema } from "@/shared/contratos/api.generated";

/**
 * T4-04 — los mensajes de validación son **claves del catálogo**, no frases.
 *
 * Un esquema se construye al cargar el módulo, cuando todavía no hay idioma elegido —y
 * cambiar de idioma después no volvería a ejecutarlo—, así que aquí no puede haber texto
 * traducido. Quien traduce es el campo, con `te()` de `useT()`.
 *
 * `mensaje()` existe solo para que el compilador vea estas cadenas como `Clave`: escritas
 * sueltas dentro del `.min(…)` serían un `string` cualquiera y una errata pasaría inadvertida
 * hasta que apareciera en pantalla.
 */
const mensaje = (clave: Clave): string => clave;

export const loginFormSchema = z.object({
    email: z.string().min(1, mensaje("validacion.correoRequerido")).email(mensaje("validacion.correoInvalido")),
    password: z.string().min(1, mensaje("validacion.contrasenaRequerida")),
});

export const registerFormSchema = z.object({
    name: z.string().min(1, mensaje("validacion.nombreRequerido")),
    email: z.string().min(1, mensaje("validacion.correoRequerido")).email(mensaje("validacion.correoInvalido")),
    password: z.string().min(8, mensaje("validacion.contrasenaMinima")),
    passwordConfirmation: z.string().min(1, mensaje("validacion.confirmaContrasena")),
}).refine((d) => d.password === d.passwordConfirmation, {
    message: mensaje("validacion.contrasenasNoCoinciden"),
    path: ["passwordConfirmation"],
});

export const forgotPasswordSchema = z.object({
    email: z.string().min(1, mensaje("validacion.correoRequerido")).email(mensaje("validacion.correoInvalido")),
});

export const resetPasswordSchema = z.object({
    password: z.string().min(8, mensaje("validacion.contrasenaMinima")),
    passwordConfirmation: z.string().min(1, mensaje("validacion.confirmaContrasena")),
}).refine((d) => d.password === d.passwordConfirmation, {
    message: mensaje("validacion.contrasenasNoCoinciden"),
    path: ["passwordConfirmation"],
});

export const updateProfileSchema = z.object({
    name: z.string().min(1, mensaje("validacion.nombreRequerido")),
    email: z.string().min(1, mensaje("validacion.correoRequerido")).email(mensaje("validacion.correoInvalido")),
});

export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, mensaje("validacion.contrasenaActualRequerida")),
    password: z.string().min(8, mensaje("validacion.contrasenaMinima")),
    passwordConfirmation: z.string().min(1, mensaje("validacion.confirmaContrasena")),
}).refine((d) => d.password === d.passwordConfirmation, {
    message: mensaje("validacion.contrasenasNoCoinciden"),
    path: ["passwordConfirmation"],
});

// Esquema para validar la respuesta del usuario autenticado
export const userSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
    role: z.string(),
    // T4-12 — el idioma en el que el servidor le escribe a este usuario. El enum sale del
    // contrato generado, no se reescribe aquí: es de la base y sus valores van en mayúsculas.
    idioma: idiomaSchema,
    isVerified: z.boolean(),
    createdAt: z.string(),
});

export type LoginForm = z.infer<typeof loginFormSchema>;
export type RegisterForm = z.infer<typeof registerFormSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordForm = z.infer<typeof updatePasswordSchema>;
export type User = z.infer<typeof userSchema>;