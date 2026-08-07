import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useMe";
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isError || !user) return <Navigate to="/auth/login" replace />;

    // Al dashboard, no al login: la sesión es válida, lo que falta es el permiso.
    if (requireRole && user.role !== requireRole) return <Navigate to="/" replace />;

    return <>{children}</>;
}
