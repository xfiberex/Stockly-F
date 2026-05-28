import { z } from "zod";

export const loginFormSchema = z.object({
    email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
    password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerFormSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    passwordConfirmation: z.string().min(1, "Confirma tu contraseña"),
}).refine((d) => d.password === d.passwordConfirmation, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmation"],
});

export const forgotPasswordSchema = z.object({
    email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
});

export const resetPasswordSchema = z.object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    passwordConfirmation: z.string().min(1, "Confirma tu contraseña"),
}).refine((d) => d.password === d.passwordConfirmation, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmation"],
});

export const updateProfileSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().min(1, "El email es obligatorio").email("Email no válido"),
});

export const updatePasswordSchema = z.object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    passwordConfirmation: z.string().min(1, "Confirma tu contraseña"),
}).refine((d) => d.password === d.passwordConfirmation, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmation"],
});

// Esquema para validar la respuesta del usuario autenticado
export const userSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string(),
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