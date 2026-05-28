import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import type { RegisterForm } from "@/modules/auth/schemas/auth.schema";

export function useRegister() {
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (form: RegisterForm) =>
            AuthAPI.register({ name: form.name, email: form.email, password: form.password }),
        onSuccess: () => {
            toast.success("Revisa tu correo para confirmar tu cuenta");
            navigate("/auth/login");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
