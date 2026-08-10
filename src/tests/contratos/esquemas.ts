/**
 * T2-24, reescrito por T4-01.
 *
 * Antes este archivo **describía de memoria** las respuestas del backend: 90 líneas de
 * esquemas Zod escritos a mano, con la referencia anotada al lado para poder comprobarlos.
 * Funcionaba, pero nada lo ataba a la API — si `PRODUCT_INCLUDE` cambiaba, esto envejecía
 * en silencio y seguía dando los mocks por buenos.
 *
 * Ahora los esquemas salen del contrato (`@/shared/contratos`, copia de
 * `Stockly-B/src/contratos/api.ts`), que el backend comprueba contra sus respuestas reales
 * en `src/tests/contratos.test.ts`. Aquí solo quedan los alias con los nombres que ya
 * usaban los tests y el ayudante que valida los mocks al importarlos.
 */

import type { z } from "zod";
import { ajusteSchema, ordenVentaSchema, paginadoSchema, productoSchema } from "@/shared/contratos";

export { ajusteSchema, productoSchema, paginadoSchema };

/** Se llamaba así antes de que el contrato lo bautizara `ordenVentaSchema`. */
export const ordenDeVentaSchema = ordenVentaSchema;

/**
 * Valida un mock contra su contrato y **revienta al importarlo** si no encaja.
 *
 * Se usa en el módulo de fixtures, no dentro de un `it`: así cualquier test que use un
 * mock desalineado falla, sin depender de que alguien se acuerde de comprobarlo.
 */
export function segunContrato<T>(esquema: z.ZodType<T>, valor: T, nombre: string): T {
    const resultado = esquema.safeParse(valor);
    if (!resultado.success) {
        throw new Error(
            `El mock «${nombre}» no coincide con la respuesta real del backend:\n` +
                JSON.stringify(resultado.error.issues, null, 2),
        );
    }
    return valor;
}
