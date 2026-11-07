import { useCallback, useEffect, useState } from "react";

function leer<T>(clave: string | null, inicial: T): T {
    if (clave === null) return inicial;
    try {
        const guardado = sessionStorage.getItem(clave);
        return guardado === null ? inicial : (JSON.parse(guardado) as T);
    } catch {
        return inicial;
    }
}

/**
 * AUD-011 — un `useState` que sobrevive a recargar la pestaña: lo que se escribe para un trabajo
 * largo (las cifras de un conteo, la venta del mostrador) no puede depender de que nadie toque F5.
 *
 * - **`sessionStorage`, no `localStorage`:** es de esta pestaña y muere con ella. Un borrador que
 *   reaparece días después en otro turno confunde más de lo que salva.
 * - **La clave lleva el «de quién»** —el id del conteo, el del usuario—, y con `null` no se guarda
 *   nada (todavía no se sabe de quién es).
 * - **Vuelto a su valor inicial, se borra:** no quedan claves vacías acumulándose.
 * - **Sin almacenamiento** —modo privado, cuota— se comporta como un `useState` normal.
 * - Solo admite lo que JSON sabe escribir: un `NaN` vuelve como `null`.
 */
export function useEstadoDeSesion<T>(clave: string | null, inicial: T) {
    const [estado, setEstado] = useState(() => ({ clave, valor: leer(clave, inicial) }));

    // Si cambia de quién es (otro conteo en la misma pantalla), se lee lo suyo. Ajuste durante
    // el pintado, como recomienda React, en vez de un efecto que pintaría antes lo del otro.
    let actual = estado;
    if (estado.clave !== clave) {
        actual = { clave, valor: leer(clave, inicial) };
        setEstado(actual);
    }

    const inicialEnJson = JSON.stringify(inicial);
    useEffect(() => {
        if (actual.clave === null) return;
        try {
            const json = JSON.stringify(actual.valor);
            if (json === inicialEnJson) sessionStorage.removeItem(actual.clave);
            else sessionStorage.setItem(actual.clave, json);
        } catch {
            // Sin almacenamiento, lo escrito vale mientras la pantalla siga abierta.
        }
    }, [actual.clave, actual.valor, inicialEnJson]);

    // Estable, como el de `useState`: se puede usar en un efecto sin que se repita cada pintado.
    const setValor = useCallback(
        (siguiente: T | ((previo: T) => T)) =>
            setEstado((previo) => ({
                clave: previo.clave,
                valor: typeof siguiente === "function" ? (siguiente as (p: T) => T)(previo.valor) : siguiente,
            })),
        [],
    );

    return [actual.valor, setValor] as const;
}
