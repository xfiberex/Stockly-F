import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { OpcionesSegmentadas, type OpcionSegmentada } from "@/shared/components/OpcionesSegmentadas";
import { useT } from "@/shared/hooks/useIdioma";
import { useTema } from "@/shared/hooks/useTema";
import type { Tema } from "@/shared/lib/tema";

/**
 * T4-11 — elección de tema: claro, oscuro o automático.
 *
 * **Se aplica al instante y no pasa por «Guardar cambios»**: es una preferencia local, no un
 * ajuste de la aplicación (ver `shared/lib/tema.ts` sobre por qué no vive en la API).
 */
export function SelectorDeTema() {
    const { tema, cambiarTema } = useTema();
    const { t } = useT();

    const opciones: ReadonlyArray<OpcionSegmentada<Tema>> = [
        { valor: "auto", etiqueta: t("apariencia.tema.auto"), descripcion: t("apariencia.tema.autoAyuda"), Icono: ComputerDesktopIcon },
        { valor: "claro", etiqueta: t("apariencia.tema.claro"), descripcion: t("apariencia.tema.claroAyuda"), Icono: SunIcon },
        { valor: "oscuro", etiqueta: t("apariencia.tema.oscuro"), descripcion: t("apariencia.tema.oscuroAyuda"), Icono: MoonIcon },
    ];

    return (
        <OpcionesSegmentadas
            leyenda={t("apariencia.tema.titulo")}
            ayuda={t("apariencia.tema.ayuda")}
            nombre="tema"
            opciones={opciones}
            valor={tema}
            onCambio={cambiarTema}
        />
    );
}
