import { useMutation } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import type { ForgotPasswordForm } from "@/modules/auth/schemas/auth.schema";

export function useForgotPassword() {
    return useMutation({
        mutationFn: (form: ForgotPasswordForm) => AuthAPI.forgotPassword(form),
        onSuccess: (data) => toast.success(data.message),
        onError: (error: Error) => toast.error(error.message),
    });
}
