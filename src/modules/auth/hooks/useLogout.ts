import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";

export function useLogout() {
    const qc = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: AuthAPI.logout,
        onSuccess: () => {
            qc.removeQueries({ queryKey: queryKeys.user });
            navigate("/auth/login");
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
