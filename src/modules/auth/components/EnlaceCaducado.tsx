import { Link } from "react-router-dom";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { CLASES_ENLACE_EN_TEXTO } from "@/shared/lib/clasesDeMarco";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { MarcoDeAcceso } from "@/modules/auth/components/MarcoDeAcceso";

/**
 * AUD-014 — un enlace de correo que no sirve: falta, está mal copiado o caducó. Antes era una
 * línea roja suelta, sin `h1` y sin salida («Token inválido. Solicita un nuevo enlace», sin
 * decir dónde): la peor pantalla de la crítica, 19/40. Ahora es la misma tarjeta que las demás,
 * con un único siguiente paso.
 */
export function EnlaceCaducado({ pedirOtro, textoPedirOtro, explicacion }: { pedirOtro: string; textoPedirOtro: string; explicacion: string }) {
    const { t } = useT();
    return (
        <MarcoDeAcceso titulo={t("auth.enlace.titulo")}>
            <p className="text-center text-sm text-foreground">{explicacion}</p>
            <div className="flex flex-col items-center gap-3">
                <Link to={pedirOtro} className={cn(clasesDeBoton("primary"), "w-full")}>{textoPedirOtro}</Link>
                <Link to="/auth/login" className={cn(CLASES_ENLACE_EN_TEXTO, "text-sm")}>{t("auth.volverAlLogin")}</Link>
            </div>
        </MarcoDeAcceso>
    );
}
