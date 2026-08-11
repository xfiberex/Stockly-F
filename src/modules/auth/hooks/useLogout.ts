import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export function useLogout() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const { idioma } = useT();

    return useMutation({
        mutationFn: AuthAPI.logout,
        onSuccess: () => {
            qc.removeQueries({ queryKey: queryKeys.user });
            navigate("/auth/login");
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
