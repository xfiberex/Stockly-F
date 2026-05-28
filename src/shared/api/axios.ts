import axios from "axios";
import { toast } from "react-toastify";
import { env } from "@/config/env";

const api = axios.create({
    baseURL: env.API_URL.replace(/\/$/, ""),
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
            toast.warn("Demasiadas solicitudes. Espera un momento e intenta de nuevo.", {
                toastId: "rate-limit",
            });
        }
        return Promise.reject(error);
    },
);

export default api;