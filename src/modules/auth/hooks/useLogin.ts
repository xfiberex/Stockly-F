import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { LoginForm } from "@/modules/auth/schemas/auth.schema";

export function useLogin() {
    const qc = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (form: LoginForm) => AuthAPI.login(form),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.user });
            navigate("/");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
