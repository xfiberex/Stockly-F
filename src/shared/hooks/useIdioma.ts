import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
    elegirIdioma,
    idiomaEfectivo,
    leerPreferenciaDeIdioma,
    suscribirseAlIdioma,
    type Idioma,
    type PreferenciaDeIdioma,
} from "@/shared/i18n/idioma";
import { traducir, traducirCantidad, type Clave, type ClavePlural, type Valores } from "@/shared/i18n/traducir";

/**
 * T4-04 — traducir desde un componente.
 *
 * `useSyncExternalStore` por lo mismo que en `useTema`: la fuente de verdad es `localStorage`,
 * que puede cambiar desde otra pestaña, y el `getSnapshot` devuelve una cadena que React
 * compara por valor.
 *
 * No hay contexto de React de por medio a propósito. Un proveedor obligaría a envolver cada
 * `render` de test —son 50 archivos— y a recordar hacerlo en el siguiente; con el hook leyendo
 * del almacenamiento, un componente aislado se traduce solo.
 */
export function useIdioma(): {
    preferencia: PreferenciaDeIdioma;
    idioma: Idioma;
    cambiarIdioma: (preferencia: PreferenciaDeIdioma) => void;
} {
    const preferencia = useSyncExternalStore(
        suscribirseAlIdioma,
        leerPreferenciaDeIdioma,
        () => "auto" as PreferenciaDeIdioma,
    );

    return { preferencia, idioma: idiomaEfectivo(preferencia), cambiarIdioma: elegirIdioma };
}

export interface Traductor {
    /** `t("productos.titulo")`, y con interpolación `t("productos.editar", { nombre })`. */
    t: (clave: Clave, valores?: Valores) => string;
    /** Elige forma según la cantidad, que además se interpola como `{cantidad}`. */
    tn: (clave: ClavePlural, cantidad: number, valores?: Valores) => string;
    idioma: Idioma;
}

export function useT(): Traductor {
    const { idioma } = useIdioma();

    const t = useCallback((clave: Clave, valores?: Valores) => traducir(idioma, clave, valores), [idioma]);
    const tn = useCallback(
        (clave: ClavePlural, cantidad: number, valores?: Valores) => traducirCantidad(idioma, clave, cantidad, valores),
        [idioma],
    );

    return useMemo(() => ({ t, tn, idioma }), [t, tn, idioma]);
}
