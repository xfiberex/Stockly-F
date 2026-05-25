import axios from "axios";
import { env } from "@/config/env";

// Crear una instancia de Axios con la configuración base
export const api = axios.create({
    baseURL: env.API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Interceptar respuestas para manejar errores de manera centralizada
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error.response?.data?.message ??
            error.message ??
            "Error inesperado";
        return Promise.reject(new Error(message));
    },
);