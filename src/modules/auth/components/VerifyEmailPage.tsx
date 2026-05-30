import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Spinner } from "@/shared/components/Spinner";
import { AuthAPI } from "@/modules/auth/api/auth.api";

export default function VerifyEmailPage() {
    const [params] = useSearchParams();
    const token = params.get("token") ?? "";
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        token ? "loading" : "error"
    );
    const [message, setMessage] = useState(token ? "" : "Token no proporcionado.");

    useEffect(() => {
        if (!token) {
            return;
        }

        AuthAPI.verifyEmail(token)
            .then(() => setStatus("success"))
            .catch((e: Error) => {
                setStatus("error");
                setMessage(e.message);
            });
    }, [token]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4">
            {status === "loading" && <Spinner size="lg" />}
            {status === "success" && (
                <>
                    <p className="text-green-600 font-medium text-lg">¡Cuenta confirmada!</p>
                    <Link to="/auth/login" className="text-blue-600 hover:underline text-sm">
                        Inicia sesión
                    </Link>
                </>
            )}
            {status === "error" && (
                <>
                    <p className="text-red-600 font-medium">{message || "El enlace es inválido o expiró."}</p>
                    <Link
                        to="/auth/resend-verification"
                        className="text-blue-600 hover:underline text-sm"
                    >
                        Solicitar nuevo enlace de verificación
                    </Link>
                    <Link to="/auth/login" className="text-gray-500 hover:underline text-sm">
                        Volver al inicio de sesión
                    </Link>
                </>
            )}
        </div>
    );
}
