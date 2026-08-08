import { Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
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
                <h1 className="mt-2 text-xl font-semibold text-foreground">Página no encontrada</h1>
                <p className="mt-1 text-sm text-foreground-muted">La ruta que buscas no existe.</p>
            </div>
            <Link
                to="/"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface hover:bg-primary transition-colors"
            >
                Volver al Dashboard
            </Link>
        </div>
    );
}
