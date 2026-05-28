import axios from "axios";
import { toast } from "react-toastify";
import { env } from "@/config/env";
import { queryClient } from "@/shared/lib/queryClient";
import { queryKeys } from "@/shared/constants/queryKeys";

const api = axios.create({
    baseURL: env.API_URL.replace(/\/$/, ""),
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status === 401 && !window.location.pathname.startsWith("/auth/")) {
                // Sesión expirada o inválida — limpiar cache y redirigir
                queryClient.removeQueries({ queryKey: queryKeys.user });
                window.location.replace("/auth/login");
            }

            if (status === 429) {
                toast.warn("Demasiadas solicitudes. Espera un momento e intenta de nuevo.", {
                    toastId: "rate-limit",
                });
            }
        }
        return Promise.reject(error);
    },
);

export default api;
