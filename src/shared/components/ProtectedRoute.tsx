import { Fragment } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { useNegocio } from "@/modules/settings/hooks/useNegocio";
import { useSimboloDeMoneda } from "@/shared/hooks/useSimboloDeMoneda";
import { Spinner } from "@/shared/components/Spinner";

interface ProtectedRouteProps {
    children: React.ReactNode;
    /**
     * Rol exigido para entrar. Sin él basta con tener sesión. El backend ya protege
     * estos endpoints; esto evita que un usuario sin permisos llegue a una pantalla
     * que solo puede mostrarle una cascada de errores 403.
     */
    requireRole?: string;
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
    const { user, isLoading, isError } = useAuth();
    // T6-03 — la moneda del negocio se pide en cuanto hay sesión y **se espera aquí**, con el
    // mismo spinner: una pantalla que pintara antes saldría con `$` y cambiaría a `RD$` un
    // instante después. Si la petición falla no se bloquea la aplicación: se queda el símbolo
    // por defecto, que es lo que había antes de que fuese configurable.
    const negocio = useNegocio({ enabled: Boolean(user) });
    const simbolo = useSimboloDeMoneda();

    if (isLoading || (user && negocio.isLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isError || !user) return <Navigate to="/auth/login" replace />;

    // Al dashboard, no al login: la sesión es válida, lo que falta es el permiso.
    if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;

    // La clave vuelve a montar las pantallas cuando un administrador cambia el símbolo:
    // `formatearImporte` es una función pura y nada más les diría que vuelvan a pintar.
    return <Fragment key={simbolo}>{children}</Fragment>;
}
