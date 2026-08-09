import { useEffect, useRef, useState } from "react";

/**
 * T2-16 — comportamiento común de los menús desplegables de la barra de navegación.
 *
 * `UserMenu` y `NavDropdown` repetían el cierre al pulsar fuera y no tenían ninguno de
 * los dos el cierre con Escape, que es la única salida para quien navega con teclado:
 * sin él, un menú abierto obliga a tabular por todas sus opciones para salir.
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
