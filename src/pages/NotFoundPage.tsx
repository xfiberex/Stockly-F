import { Link } from "react-router-dom";
import { CubeIcon } from "@heroicons/react/24/outline";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
            <div className="flex items-center gap-2 font-bold text-gray-400">
                <CubeIcon className="h-5 w-5" />
                Stockly
            </div>
            <div className="text-center">
                <p className="text-6xl font-black text-gray-200">404</p>
                <h1 className="mt-2 text-xl font-semibold text-gray-800">
                    Página no encontrada
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    La ruta que buscas no existe.
                </p>
            </div>
            <Link
                to="/"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
                Volver al Dashboard
            </Link>
        </div>
    );
}