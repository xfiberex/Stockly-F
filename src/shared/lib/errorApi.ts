import axios from "axios";
import type { RespuestaDeError } from "@/shared/contratos";
import type { Idioma } from "@/shared/i18n/idioma";
import { traducir, type Clave } from "@/shared/i18n/traducir";

/**
 * El mensaje que se le enseña al usuario cuando la API falla (T4-04).
 *
 * Antes había quince variantes de `err?.response?.data?.message ?? "Error al …"` repartidas
 * por los hooks. Eso ya era duplicación, pero con dos idiomas pasa a ser un fallo: ese
 * `message` viene del servidor **en español**, así que en inglés se colaba una frase suelta en
 * mitad de la pantalla.
 *
 * El orden de preferencia dice cuál es el contrato de verdad:
 *
 * 1. **`code`** — lo que la API dice que pasó. Se traduce con el catálogo del cliente, y sus
 *    `params` rellenan los huecos, que es lo que permite reordenar la frase en otro idioma.
 * 2. **`message`** — el respaldo del servidor. Solo lo alcanzan los errores que no lanza la
 *    aplicación (una librería de terceros, un proxy delante). Sale en español, y es
 *    preferible una frase entendible que un texto genérico que no dice nada.
 * 3. **La clave de respaldo** que pasa quien llama, o `error.generico`.
 *
 * Sin respuesta no hay servidor al que culpar: eso es `error.red`.
 */
export function mensajeDeError(idioma: Idioma, error: unknown, respaldo: Clave = "error.generico"): string {
    if (axios.isAxiosError(error)) {
        const cuerpo = error.response?.data as Partial<RespuestaDeError> | undefined;

        if (cuerpo?.code) {
            return traducir(idioma, `error.${cuerpo.code}` as Clave, cuerpo.params);
        }

        if (typeof cuerpo?.message === "string" && cuerpo.message.trim() !== "") {
            return cuerpo.message;
        }

        // `request` sin `response`: la petición salió y nadie contestó.
        if (!error.response && error.request) return traducir(idioma, "error.red");
    }

    return traducir(idioma, respaldo);
}
