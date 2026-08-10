import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useT } from "@/shared/hooks/useIdioma";
import { tituloDeRuta } from "@/shared/lib/titulos";

/**
 * T2-18 — foco y anuncio al cambiar de ruta.
 *
 * En una SPA la navegación no recarga nada: el foco se queda en el enlace que se pulsó
 * —dentro de la barra de navegación— y el lector de pantalla no dice que la página haya
 * cambiado. Quien navega con teclado tiene que volver a recorrer el menú entero para
 * llegar al contenido nuevo, y quien no ve la pantalla no se entera de que llegó.
 *
 * Tres cosas, entonces, en cada cambio de ruta:
 *   1. la página vuelve arriba;
 *   2. el foco se mueve a `<main id="contenido" tabIndex={-1}>` (el destino que dejó
 *      puesto T2-11), así que el siguiente Tab sigue *dentro* del contenido;
 *   3. la región `aria-live` cambia de texto, y eso es lo que se anuncia.
 *
 * Lo primero hace falta porque React Router **no restablece el desplazamiento**: al
 * cambiar de ruta se conserva el del documento anterior y se aterriza a media página.
 * El `focus()` lo disimulaba a medias y de la peor manera: al enfocar un elemento más
 * alto que la ventana, el navegador desplaza lo mínimo, y estando por debajo eso alinea
 * el *final* de `<main>` con el borde inferior — nunca su principio. Medido: desde 800 px
 * en Reportes, al ir a Dashboard quedaba en 202 px, con el `<h1>` a −113 px. De ahí que
 * hubiera que subir a mano para ver el título.
 *
 * `preventScroll` en el foco, entonces: quien decide dónde queda la página es el
 * `scrollTo`, y no dos mecanismos peleándose por ello.
 *
 * Solo en navegación nueva (`PUSH`/`REPLACE`). En `POP` —atrás y adelante— el navegador
 * restaura la posición que tenía esa entrada del historial, y volver arriba a la fuerza
 * borraría justo lo que el usuario espera recuperar.
 *
 * El texto se **deriva** del `pathname` en vez de guardarse en un estado sincronizado
 * por un efecto: además de evitar el `setState` en efecto que ya costó T1-08 y T1-10,
 * una región viva anuncia sus *cambios*, no su contenido inicial, así que renderizarlo
 * directamente da justo el comportamiento que se busca en la primera carga: silencio.
 */
export function AnuncioDeRuta() {
    const { pathname } = useLocation();
    const tipoDeNavegacion = useNavigationType();
    // T4-04: la lista guarda la clave y aquí se traduce, así que cambiar de idioma
    // reescribe el `document.title` y lo que anuncia la región viva sin tocar nada más.
    const { t } = useT();
    const titulo = t(tituloDeRuta(pathname));
    const yaNavegado = useRef(false);

    useEffect(() => {
        document.title = `${titulo} · Stockly`;

        // En la primera carga el navegador ya anuncia la página, y mover el foco aquí
        // se lo quitaría a quien acaba de llegar. Solo se mueve al *cambiar* de ruta.
        if (!yaNavegado.current) {
            yaNavegado.current = true;
            return;
        }

        if (tipoDeNavegacion !== "POP") {
            // Sin `behavior`, o sea instantáneo: un salto animado en cada cambio de
            // página molesta a quien pidió menos movimiento (T2-12) y no informa de nada.
            window.scrollTo(0, 0);
        }

        document.getElementById("contenido")?.focus({ preventScroll: true });
    }, [pathname, titulo, tipoDeNavegacion]);

    return (
        <p aria-live="polite" className="sr-only">
            {titulo}
        </p>
    );
}
