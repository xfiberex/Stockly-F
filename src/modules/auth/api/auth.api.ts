import api from "@/shared/api/axios";
import type {
    LoginForm,
    RegisterForm,
    ForgotPasswordForm,
    UpdateProfileForm,
    UpdatePasswordForm,
    User,
} from "@/modules/auth/schemas/auth.schema";
import type {
    AuthLoginData,
    UpdateProfileResponse,
    UpdatePasswordResponse,
} from "@/modules/auth/types/auth.types";
import type { IdiomaDeCorreo, IdiomaGuardado } from "@/shared/contratos/api.generated";

export const AuthAPI = {
    register: async (form: Omit<RegisterForm, "passwordConfirmation">) => {
        const { data } = await api.post<{ message: string }>("/auth/register", form);
        return data;
    },

    verifyEmail: async (token: string) => {
        const { data } = await api.post<{ message: string }>("/auth/verify-email", { token });
        return data;
    },

    resendVerification: async (email: string) => {
        const { data } = await api.post<{ message: string }>("/auth/resend-verification", { email });
        return data;
    },

    login: async (form: LoginForm) => {
        const { data } = await api.post<{ message: string; data: AuthLoginData }>("/auth/login", form);
        return data;
    },

    logout: async () => {
        const { data } = await api.post<{ message: string }>("/auth/logout");
        return data;
    },

    // signal permite cancelar la petición cuando el componente se desmonta
    getMe: async (signal?: AbortSignal) => {
        const { data } = await api.get<{ data: User }>("/auth/me", { signal });
        return data.data;
    },

    forgotPassword: async (form: ForgotPasswordForm) => {
        const { data } = await api.post<{ message: string }>("/auth/forgot-password", form);
        return data;
    },

    // token viene del query param ?token= del URL, no del formulario
    resetPassword: async (token: string, password: string) => {
        const { data } = await api.post<{ message: string }>("/auth/reset-password", { token, password });
        return data;
    },

    updateProfile: async (form: UpdateProfileForm) => {
        const { data } = await api.put<UpdateProfileResponse>("/auth/me", form);
        return data;
    },

    // passwordConfirmation es solo validación visual — nunca se envía al backend
    updatePassword: async (form: Omit<UpdatePasswordForm, "passwordConfirmation">) => {
        const { data } = await api.patch<UpdatePasswordResponse>("/auth/me/password", form);
        return data;
    },

    /**
     * T4-12 — deja en el servidor el idioma en el que escribirle a este usuario.
     *
     * Va por su propio endpoint y no por `updateProfile`: ese pide nombre y correo, y tocar
     * el correo invalida la verificación de la cuenta.
     */
    guardarIdioma: async (idioma: IdiomaDeCorreo) => {
        const { data } = await api.patch<{ data: IdiomaGuardado }>("/auth/me/idioma", { idioma });
        return data.data;
    },
};
