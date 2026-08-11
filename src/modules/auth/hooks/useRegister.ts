import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { RegisterForm } from "@/modules/auth/schemas/auth.schema";

export function useRegister() {
    const navigate = useNavigate();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (form: RegisterForm) =>
            AuthAPI.register({ name: form.name, email: form.email, password: form.password }),
        onSuccess: () => {
            toast.success(t("auth.registro.aviso"));
            navigate("/auth/login");
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
