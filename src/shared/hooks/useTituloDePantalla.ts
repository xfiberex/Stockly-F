import { useEffect, useSyncExternalStore } from "react";
import type { Clave } from "@/shared/i18n/traducir";

/**
 * AUD-014 — el título de una pantalla cuando no es el de su ruta.
 *
 * `AnuncioDeRuta` saca el título de la pestaña y lo que anuncia del `pathname`, y casi siempre
 * basta. Pero `/auth/reset-password` con un enlace caducado no es «Nueva contraseña»: su `h1`
 * dice «Este enlace ya no sirve», y la pestaña y el anuncio tienen que decir lo mismo. La
 * pantalla lo pide con este hook mientras está montada, y al desmontarse vuelve el de la ruta.
 *
 * Es un almacén de módulo y no un contexto porque `AnuncioDeRuta` es hermano de las páginas,
 * no su antepasado. Guarda la **clave**, como `TITULOS_DE_RUTA`: traduce quien pinta.
 */
let forzado: Clave | null = null;
const oyentes = new Set<() => void>();

function avisar() {
    for (const oyente of oyentes) oyente();
}

function suscribir(oyente: () => void) {
    oyentes.add(oyente);
    return () => oyentes.delete(oyente);
}

/** Lo lee `AnuncioDeRuta`: la clave que ha pedido la pantalla, o `null`. */
export function useTituloForzado(): Clave | null {
    return useSyncExternalStore(suscribir, () => forzado, () => null);
}

/** Lo llama la pantalla mientras su `h1` no es el de la ruta; con `null`, manda la ruta. */
export function useTituloDePantalla(titulo: Clave | null) {
    useEffect(() => {
        if (titulo === null) return;
        forzado = titulo;
        avisar();
        return () => {
            if (forzado === titulo) {
                forzado = null;
                avisar();
            }
        };
    }, [titulo]);
}
