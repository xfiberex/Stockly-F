import { ComputerDesktopIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { OpcionesSegmentadas, type OpcionSegmentada } from "@/shared/components/OpcionesSegmentadas";
import { useIdioma, useT } from "@/shared/hooks/useIdioma";
import type { PreferenciaDeIdioma } from "@/shared/i18n/idioma";

/**
 * T4-04 — elección de idioma: automático, español o inglés.
 *
 * Los nombres de los idiomas **no se traducen**: «Español» se escribe igual esté la interfaz
 * en el idioma que esté, y «English» también. Es la convención de cualquier selector de idioma,
 * y por una razón práctica: quien tiene la aplicación en un idioma que no entiende necesita
 * reconocer el suyo en la lista para poder salir de ahí.
 */
export function SelectorDeIdioma() {
    const { preferencia, cambiarIdioma } = useIdioma();
    const { t } = useT();

    const opciones: ReadonlyArray<OpcionSegmentada<PreferenciaDeIdioma>> = [
        {
            valor: "auto",
            etiqueta: t("apariencia.idioma.auto"),
            descripcion: t("apariencia.idioma.autoAyuda"),
            Icono: ComputerDesktopIcon,
        },
        { valor: "es", etiqueta: "Español", descripcion: "Español", Icono: LanguageIcon },
        { valor: "en", etiqueta: "English", descripcion: "English", Icono: LanguageIcon },
    ];

    return (
        <OpcionesSegmentadas
            leyenda={t("apariencia.idioma.titulo")}
            ayuda={t("apariencia.idioma.ayuda")}
            nombre="idioma"
            opciones={opciones}
            valor={preferencia}
            onCambio={cambiarIdioma}
        />
    );
}
