import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { Spinner } from "@/shared/components/Spinner";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading, isError } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (isError || !user) return <Navigate to="/auth/login" replace />;

    return <>{children}</>;
}
