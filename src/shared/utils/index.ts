import { isAxiosError } from "axios";

export function handleAPIError(error: unknown): never {
    if (isAxiosError(error)) {
        const message =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            "Error en la solicitud";
        throw new Error(message);
    }
    if (error instanceof Error) throw error;
    throw new Error("Ha ocurrido un error inesperado");
}