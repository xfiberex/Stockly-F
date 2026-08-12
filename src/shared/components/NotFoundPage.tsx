import { Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";
import { CLASES_MARCO_CENTRADO_COLUMNA } from "@/shared/lib/clasesDeMarco";

export default function NotFoundPage() {
    const { t } = useT();

    return (
        <main className={CLASES_MARCO_CENTRADO_COLUMNA}>
            <div className="flex items-center gap-2 font-bold text-foreground-muted">
                <CubeIcon className="h-5 w-5" />
                Stockly
            </div>
            <div className="text-center">
                {/* Era `text-6xl font-black`: un tamaño y un peso que no usaba nadie
                    más, y el 900 ni siquiera estaba cargado (lo fingía el navegador).
                    Con el tamaño mayor de la escala y un peso real sigue leyéndose
                    como lo que es: el número grande de una página de error. */}
                <p className="text-2xl font-bold text-foreground-muted">404</p>
                <h1 className="mt-2 text-xl font-semibold text-foreground">{t("ruta.noEncontrada")}</h1>
                <p className="mt-1 text-sm text-foreground-muted">{t("noEncontrada.detalle")}</p>
            </div>
            <Link
                to="/"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary transition-colors"
            >
                {t("noEncontrada.volver")}
            </Link>
        </main>
    );
}
