import { useSyncExternalStore } from "react";
import { elegirTema, leerTema, suscribirseAlTema, type Tema } from "@/shared/lib/tema";

/**
 * T4-11 — la preferencia de tema, leída desde React.
 *
 * `useSyncExternalStore` y no `useState` porque la fuente de verdad **no es de React**: es
 * `localStorage`, que puede cambiar desde otra pestaña. El `getSnapshot` devuelve una cadena,
 * así que React la compara por valor y no hay riesgo de bucle por identidad.
 *
 * El tercer argumento es el `getServerSnapshot`. Aquí no hay SSR, pero React lo llama también
 * al hidratar en el primer render de un entorno sin `window` —y los tests corren en jsdom con
 * `window`, así que devolver `auto` es solo la respuesta segura si algún día lo hubiera.
 */
export function useTema(): { tema: Tema; cambiarTema: (tema: Tema) => void } {
    const tema = useSyncExternalStore(suscribirseAlTema, leerTema, () => "auto" as Tema);

    return { tema, cambiarTema: elegirTema };
}
