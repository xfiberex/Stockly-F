import { Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { CLASES_MARCO_CENTRADO_COLUMNA } from "@/shared/lib/clasesDeMarco";

interface NotFoundPageProps {
    /**
     * AUD-019 — la 404 se pinta en dos sitios. **Dentro de la aplicación** ya hay un `<main>`
     * —el de `App.tsx`— y una barra lateral con el nombre del producto: la página anidaba un
     * segundo `<main>` (dos landmarks principales, que un lector de pantalla anuncia los dos) y
     * repetía la marca. **Fuera**, sin sesión ni marco, sí es ella quien pone los dos.
     */
    dentroDeLaApp?: boolean;
}

export default function NotFoundPage({ dentroDeLaApp = false }: NotFoundPageProps) {
    const { t } = useT();

    const contenido = (
        <>
            <div className="text-center">
                {/* Era `text-6xl font-black`: un tamaño y un peso que no usaba nadie
                    más, y el 900 ni siquiera estaba cargado (lo fingía el navegador).
                    Con el tamaño mayor de la escala y un peso real sigue leyéndose
                    como lo que es: el número grande de una página de error. */}
                <p className="text-2xl font-bold text-foreground-muted">404</p>
                <h1 className="mt-2 text-xl font-semibold text-foreground">{t("ruta.noEncontrada")}</h1>
                <p className="mt-1 text-sm text-foreground-muted">{t("noEncontrada.detalle")}</p>
            </div>
            {/* AUD-019 — «Volver al inicio» y no «al Dashboard»: `/` no es el panel para todos
                (a SELLER lo lleva al mostrador) y el panel no se llama así en la interfaz. */}
            <Link to="/" className={clasesDeBoton("primary")}>
                {t("noEncontrada.volver")}
            </Link>
        </>
    );

    if (dentroDeLaApp) {
        return <div className="flex flex-col items-center gap-6 px-4 py-16 sm:py-24">{contenido}</div>;
    }

    return (
        <main className={CLASES_MARCO_CENTRADO_COLUMNA}>
            <div className="flex items-center gap-2 font-bold text-foreground-muted">
                <CubeIcon className="h-5 w-5" />
                Stockly
            </div>
            {contenido}
        </main>
    );
}
