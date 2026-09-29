import axios from "axios";
import { toast } from "react-toastify";
import api from "@/shared/api/axios";
import { idiomaEfectivo } from "@/shared/i18n/idioma";
import { downloadBlob } from "@/shared/lib/descarga";
import { mensajeDeError } from "@/shared/lib/errorApi";

/**
 * Descarga un archivo de la API por axios, como `blob`, y lo guarda con `nombre`.
 *
 * Es el camino de T2-34 para **todas** las descargas. Un `<a href>` apuntando a la API solo
 * funciona si la API está en el mismo origen que la SPA: con un `VITE_API_URL` absoluto el
 * navegador ignora `download` —el nombre lo decide el servidor, y Playwright no ve descarga—,
 * y en cualquier caso la petición no pasa por el interceptor, así que con la sesión caducada
 * se guarda el JSON del 401 como si fuera el archivo. Aquí el interceptor renueva la sesión,
 * y los bytes llegan intactos, con la marca de orden de bytes que pone el backend en los CSV.
 *
 * Nunca rechaza: quien llama es un `onClick`. Un fallo se avisa con el mensaje traducido de su
 * código —un 413 de exportación demasiado grande dice cuántas filas y cuál es el máximo—.
 */
export async function descargarDeLaApi(
    ruta: string,
    params: Record<string, string | undefined>,
    nombre: string,
): Promise<void> {
    try {
        const { data } = await api.get<Blob>(ruta, { params, responseType: "blob" });
        downloadBlob(data, nombre);
    } catch (error) {
        if (!axios.isAxiosError(error)) throw error;

        // Con `responseType: "blob"` también el cuerpo del error llega como blob, y
        // `mensajeDeError` busca su `code` en un objeto.
        const cuerpo: unknown = error.response?.data;
        if (error.response && cuerpo instanceof Blob) {
            try {
                error.response.data = JSON.parse(await cuerpo.text());
            } catch {
                // No era JSON (un proxy delante): se queda en el mensaje genérico.
            }
        }

        // Un 401 que el interceptor no pudo renovar ya está llevando al login.
        if (error.response?.status === 401) return;
        toast.error(mensajeDeError(idiomaEfectivo(), error));
    }
}
