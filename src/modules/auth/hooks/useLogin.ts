import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { LoginForm } from "@/modules/auth/schemas/auth.schema";

/** AUD-014 — el error lo pinta la pantalla, dentro de la tarjeta (`AvisoDeAcceso`), no un aviso de 3 s. */
export function useLogin() {
    const qc = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: (form: LoginForm) => AuthAPI.login(form),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.user });
            navigate("/");
        },
    });
}
