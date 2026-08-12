import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useIdioma } from "@/shared/hooks/useIdioma";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { IdiomaDeCorreo } from "@/shared/contratos/api.generated";

/** `"es"` (etiqueta de idioma, del navegador) → `"ES"` (enum de la base). */
const aEnum = (idioma: string): IdiomaDeCorreo => (idioma === "en" ? "EN" : "ES");

/**
 * T4-12 — mantiene en el servidor el idioma en el que escribirle a este usuario.
 *
 * **Por qué hace falta.** La preferencia de la interfaz vive en el `localStorage` y es por
 * dispositivo; el servidor no la ve. Pero un correo se redacta sin nadie delante —la alerta
 * de bajo stock la dispara una venta ajena—, así que el idioma tiene que estar guardado. Este
 * hook es el puente entre las dos cosas.
 *
 * **Cuándo escribe.** Solo cuando lo guardado y lo efectivo no coinciden, que cubre los dos
 * casos que importan: cambiar de idioma con la sesión abierta, y entrar desde un dispositivo
 * configurado en otro. En el caso normal —que es el de siempre— no manda nada.
 *
 * **Por qué no vive dentro de `elegirIdioma`.** Esa función la llaman el selector de ajustes
 * y el arranque de la aplicación, y no sabe si hay sesión: metiendo ahí la llamada, cambiar
 * de idioma en la pantalla de login dispararía un `PATCH` que responde 401. Aquí se monta
 * dentro del layout autenticado, donde hay usuario por definición.
 */
export function useSincronizarIdioma(): void {
    const { user } = useAuth();
    const { idioma } = useIdioma();
    const queryClient = useQueryClient();

    // Lo último que se **intentó** enviar. Sin esto, el ciclo se repetiría mientras la
    // petición está en vuelo: el efecto vuelve a correr en cada render y `user.idioma`
    // sigue siendo el viejo hasta que la caché se invalida.
    const enviado = useRef<IdiomaDeCorreo | null>(null);

    useEffect(() => {
        if (!user) return;

        const deseado = aEnum(idioma);
        if (user.idioma === deseado || enviado.current === deseado) return;

        enviado.current = deseado;

        AuthAPI.guardarIdioma(deseado)
            .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.user }))
            .catch(() => {
                // **Se calla a propósito.** Esto no es una acción del usuario: nadie ha
                // pedido guardar nada, así que un toast de error hablaría de algo que no se
                // ha hecho. Si falla, los correos siguen saliendo en el idioma anterior y el
                // siguiente arranque lo reintenta.
                enviado.current = null;
            });
    }, [user, idioma, queryClient]);
}
