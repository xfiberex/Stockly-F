import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";

export function useResendVerification() {
    return useMutation({
        mutationFn: (email: string) => AuthAPI.resendVerification(email),
        onSuccess: () => toast.success("Correo de verificación reenviado. Revisa tu bandeja."),
        onError: (error: Error) => toast.error(error.message),
    });
}
