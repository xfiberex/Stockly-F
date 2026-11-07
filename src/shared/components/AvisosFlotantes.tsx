import { ToastContainer } from "react-toastify";
import { useTema } from "@/shared/hooks/useTema";

/**
 * AUD-014 — los avisos flotantes, con el tema de la aplicación. Antes iban siempre en claro: un
 * rectángulo blanco sobre la interfaz oscura. Y 6 s en vez de 3: un aviso de 3 s no da tiempo a
 * leer una frase entera (WCAG 2.2.1). Lo que hay que poder releer —el error de un formulario—
 * no va aquí, va en la propia pantalla.
 */
export function AvisosFlotantes() {
    const { tema } = useTema();
    const oscuro = tema === "oscuro" || (tema === "auto" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    return <ToastContainer position="top-right" autoClose={6000} theme={oscuro ? "dark" : "light"} />;
}
