import { Link } from "react-router-dom";
import { useT } from "@/shared/hooks/useIdioma";
import { useTituloDePantalla } from "@/shared/hooks/useTituloDePantalla";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO } from "@/shared/lib/clasesDeMarco";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";
import type { EstadoDeAcceso } from "@/modules/auth/lib/estadoDeAcceso";

/**
 * AUD-014 — un enlace de correo que no sirve: falta, está mal copiado o caducó. Antes era una
 * línea roja suelta, sin `h1` y sin salida («Token inválido. Solicita un nuevo enlace», sin
 * decir dónde): la peor pantalla de la crítica, 19/40. Ahora es la misma tarjeta que las demás,
 * con un único siguiente paso.
 *
 * La pantalla cambia de golpe (llega tras comprobar el enlace), así que el foco va al `h1`, y la
 * pestaña y el anuncio de ruta dicen lo mismo que él, no «Nueva contraseña».
 */
export function EnlaceCaducado({
    pedirOtro,
    textoPedirOtro,
    explicacion,
    estado,
}: {
    pedirOtro: string;
    textoPedirOtro: string;
    explicacion: string;
    /** Lo que viaja a la pantalla de pedir otro (`EstadoDeAcceso`): p. ej., que viene de una invitación. */
    estado?: EstadoDeAcceso;
}) {
    const { t } = useT();
    useTituloDePantalla("auth.enlace.titulo");

    return (
        <MarcoDeAcceso titulo={t("auth.enlace.titulo")} enfocarTitulo>
            <p className="text-center text-sm text-foreground">{explicacion}</p>
            <div className="flex flex-col items-center gap-2">
                <Link to={pedirOtro} state={estado} className={cn(clasesDeBoton("primary"), "w-full")}>{textoPedirOtro}</Link>
                <Link to="/auth/login" className={cn(CLASES_ENLACE_EN_TEXTO, CLASES_ENLACE_SUELTO, "text-sm")}>{t("auth.volverAlLogin")}</Link>
            </div>
        </MarcoDeAcceso>
    );
}
