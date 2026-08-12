import { useEffect, useRef, useState } from "react";

/**
 * T2-16 — comportamiento común de los menús desplegables de la barra de navegación.
 *
 * `UserMenu` y `NavDropdown` repetían el cierre al pulsar fuera y no tenían ninguno de
 * los dos el cierre con Escape, que es la única salida para quien navega con teclado:
 * sin él, un menú abierto obliga a tabular por todas sus opciones para salir.
 *
 * T4-10 retiró `NavDropdown` —la barra lateral no despliega nada— y el hook se quedó con
 * un solo usuario, `UserMenu`. **No se inlinea a propósito:** lo que guarda no es código
 * compartido sino el comportamiento de teclado que costó la tarea T2-16, y volverlo a
 * meter en el cuerpo del componente es la vía por la que se pierde al siguiente retoque.
 *
 * Al cerrar con Escape **el foco vuelve al botón que lo abrió**. Sin eso el foco se
 * queda en un elemento que acaba de desaparecer del DOM, el navegador lo manda al
 * `<body>` y la siguiente pulsación de Tab reempieza por el principio de la página.
 */
export function useMenuDesplegable() {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    const disparador = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function fuera(e: MouseEvent) {
            if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
        }
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, []);

    useEffect(() => {
        if (!abierto) return;

        function tecla(e: KeyboardEvent) {
            if (e.key !== "Escape") return;
            setAbierto(false);
            disparador.current?.focus();
        }

        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [abierto]);

    return {
        abierto,
        contenedor,
        disparador,
        alternar: () => setAbierto((o) => !o),
        cerrar: () => setAbierto(false),
    };
}
