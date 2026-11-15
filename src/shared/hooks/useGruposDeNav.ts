import { useState } from "react";
import { GRUPOS, grupoDeRuta, type GrupoDeNav } from "@/shared/navegacion";

/** Los grupos que la persona dejó abiertos a mano. Es una preferencia del dispositivo, como el tema. */
export const CLAVE_DE_GRUPOS_ABIERTOS = "stockly:nav.gruposAbiertos";

const esGrupo = (valor: unknown): valor is GrupoDeNav => typeof valor === "string" && Object.hasOwn(GRUPOS, valor);

/**
 * `localStorage` lanza —no devuelve `null`— con el almacenamiento bloqueado (ver `leerTema`).
 * Sin nada legible, todos cerrados, que es lo que se ve la primera vez. Lo que no sea un grupo
 * conocido se ignora: un grupo que desaparece no deja el menú roto.
 */
function leerGruposAbiertos(): ReadonlySet<GrupoDeNav> {
    try {
        const guardado: unknown = JSON.parse(window.localStorage.getItem(CLAVE_DE_GRUPOS_ABIERTOS) ?? "[]");
        return new Set(Array.isArray(guardado) ? guardado.filter(esGrupo) : []);
    } catch {
        return new Set();
    }
}

function guardarGruposAbiertos(grupos: ReadonlySet<GrupoDeNav>): void {
    try {
        window.localStorage.setItem(CLAVE_DE_GRUPOS_ABIERTOS, JSON.stringify([...grupos]));
    } catch {
        // Almacenamiento bloqueado: lo abierto vale hasta que se recargue.
    }
}

export interface GruposDeNav {
    /** El grupo de la pantalla abierta, o `null`. */
    actual: GrupoDeNav | null;
    estaAbierto: (grupo: GrupoDeNav) => boolean;
    alternar: (grupo: GrupoDeNav) => void;
}

/**
 * Qué grupos del menú están desplegados (decisión del propietario del 2026-11-15, que revisa la de
 * `T4-10`: con veinte destinos, el menú de ADMIN no cabía en la barra lateral de un portátil).
 *
 * - **Empiezan cerrados**, salvo los que la persona abrió a mano, que se recuerdan.
 * - **El de la pantalla abierta se abre solo** en cada navegación: el menú tiene que seguir diciendo
 *   dónde se está, que es lo que `T4-10` vino a arreglar. Si se cierra estando en él, se respeta
 *   hasta la siguiente navegación, y entonces se olvida.
 *
 * El estado es de `App` y lo comparten la barra lateral y el panel móvil, que pintan la misma lista.
 */
export function useGruposDeNav(pathname: string): GruposDeNav {
    const actual = grupoDeRuta(pathname);
    const [abiertos, setAbiertos] = useState(leerGruposAbiertos);
    const [cerradoAqui, setCerradoAqui] = useState(false);

    // «Cerrado aquí» se olvida al cambiar de pantalla, sin un efecto: se ajusta en el propio render,
    // que React vuelve a hacer antes de pintar. Guardar la ruta en la que se cerró no bastaba: al
    // volver a esa misma pantalla más tarde, el grupo seguía cerrado.
    const [rutaVista, setRutaVista] = useState(pathname);
    if (rutaVista !== pathname) {
        setRutaVista(pathname);
        setCerradoAqui(false);
    }

    const estaAbierto = (grupo: GrupoDeNav) => (grupo === actual ? !cerradoAqui : abiertos.has(grupo));

    const alternar = (grupo: GrupoDeNav) => {
        const abrir = !estaAbierto(grupo);
        if (grupo === actual) setCerradoAqui(!abrir);
        // También el de la pantalla actual: abrirlo o cerrarlo a mano dice cómo se lo quiere ver
        // la próxima vez que no sea el actual.
        const siguientes = new Set(abiertos);
        if (abrir) siguientes.add(grupo);
        else siguientes.delete(grupo);
        setAbiertos(siguientes);
        guardarGruposAbiertos(siguientes);
    };

    return { actual, estaAbierto, alternar };
}
