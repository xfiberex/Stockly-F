import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { toast } from "react-toastify";
import { env } from "@/config/env";
import { queryClient } from "@/shared/lib/queryClient";
import { queryKeys } from "@/shared/constants/queryKeys";
import { idiomaEfectivo } from "@/shared/i18n/idioma";
import { traducir } from "@/shared/i18n/traducir";

declare module "axios" {
    interface InternalAxiosRequestConfig {
        _retry?: boolean;
    }
}

const api = axios.create({
    baseURL: env.API_URL.replace(/\/$/, ""),
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

// Lee la cookie csrfToken (no httpOnly) que emite el backend al iniciar sesión.
function readCookie(name: string): string | undefined {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : undefined;
}

const SAFE_METHODS = new Set(["get", "head", "options"]);

// Protección CSRF double-submit: reenvía el token de la cookie como cabecera
// en toda petición que muta estado.
api.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toLowerCase();
    if (!SAFE_METHODS.has(method)) {
        const csrf = readCookie("csrfToken");
        if (csrf) config.headers.set("x-csrf-token", csrf);
    }
    return config;
});

// Cola de peticiones que llegaron mientras se estaba renovando el token
type QueueEntry = { resolve: () => void; reject: (err: unknown) => void };
let isRefreshing = false;
let pendingQueue: QueueEntry[] = [];

function drainQueue(error?: unknown) {
    pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
    pendingQueue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!axios.isAxiosError(error)) return Promise.reject(error);

        const status = error.response?.status;
        const config = error.config as InternalAxiosRequestConfig;
        const isRefreshEndpoint = config?.url?.includes("/auth/refresh");

        if (status === 401 && !isRefreshEndpoint && !config?._retry) {
            // Otra petición ya está renovando — encolar y esperar
            if (isRefreshing) {
                return new Promise<void>((resolve, reject) => {
                    pendingQueue.push({ resolve, reject });
                }).then(() => {
                    config._retry = true;
                    return api(config);
                });
            }

            config._retry = true;
            isRefreshing = true;

            try {
                // Llama al endpoint de refresh; la cookie refreshToken se envía automáticamente
                // porque el path /api/v1/auth/refresh coincide con el de la cookie
                await api.post("/auth/refresh");
                drainQueue();
                return api(config);
            } catch (refreshError) {
                drainQueue(refreshError);
                queryClient.removeQueries({ queryKey: queryKeys.user });
                if (!window.location.pathname.startsWith("/auth/")) {
                    window.location.replace("/auth/login");
                }
                return Promise.reject(error);
            } finally {
                isRefreshing = false;
            }
        }

        // El propio refresh falló (refresh token expirado) o ya reintentamos — cerrar sesión
        if (status === 401 && !window.location.pathname.startsWith("/auth/")) {
            queryClient.removeQueries({ queryKey: queryKeys.user });
            window.location.replace("/auth/login");
        }

        if (status === 429) {
            // T4-04 — este módulo no es un componente y no puede usar el hook, así que el
            // idioma se lee del almacenamiento en el momento de avisar. Da igual: la
            // preferencia vive ahí, no en React, y aquí se necesita una sola vez.
            toast.warn(traducir(idiomaEfectivo(), "error.RATE_LIMITED"), {
                toastId: "rate-limit",
            });
        }

        return Promise.reject(error);
    },
);

export default api;
