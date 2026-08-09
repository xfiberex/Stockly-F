import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { tituloDeRuta } from "@/shared/lib/titulos";

/**
 * T2-18 — foco y anuncio al cambiar de ruta.
 *
 * En una SPA la navegación no recarga nada: el foco se queda en el enlace que se pulsó
 * —dentro de la barra de navegación— y el lector de pantalla no dice que la página haya
 * cambiado. Quien navega con teclado tiene que volver a recorrer el menú entero para
 * llegar al contenido nuevo, y quien no ve la pantalla no se entera de que llegó.
 *
 * Dos cosas, entonces, en cada cambio de ruta:
 *   1. el foco se mueve a `<main id="contenido" tabIndex={-1}>` (el destino que dejó
 *      puesto T2-11), así que el siguiente Tab sigue *dentro* del contenido;
 *   2. la región `aria-live` cambia de texto, y eso es lo que se anuncia.
 *
 * El texto se **deriva** del `pathname` en vez de guardarse en un estado sincronizado
 * por un efecto: además de evitar el `setState` en efecto que ya costó T1-08 y T1-10,
 * una región viva anuncia sus *cambios*, no su contenido inicial, así que renderizarlo
 * directamente da justo el comportamiento que se busca en la primera carga: silencio.
 */
export function AnuncioDeRuta() {
    const { pathname } = useLocation();
    const titulo = tituloDeRuta(pathname);
    const yaNavegado = useRef(false);

    useEffect(() => {
        document.title = `${titulo} · Stockly`;

        // En la primera carga el navegador ya anuncia la página, y mover el foco aquí
        // se lo quitaría a quien acaba de llegar. Solo se mueve al *cambiar* de ruta.
        if (!yaNavegado.current) {
            yaNavegado.current = true;
            return;
        }

        document.getElementById("contenido")?.focus();
    }, [pathname, titulo]);

    return (
        <p aria-live="polite" className="sr-only">
            {titulo}
        </p>
    );
}
