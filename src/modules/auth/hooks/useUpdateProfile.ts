import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { UpdateProfileForm } from "@/modules/auth/schemas/auth.schema";

export function useUpdateProfile() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (form: UpdateProfileForm) => AuthAPI.updateProfile(form),
        onSuccess: (data) => {
            if (data.emailChanged) {
                // Si cambió el email, la sesión queda pendiente de reverificación
                toast.info(data.message);
                qc.removeQueries({ queryKey: queryKeys.user });
            } else {
                qc.invalidateQueries({ queryKey: queryKeys.user });
                toast.success(data.message);
            }
        },
        onError: (error: Error) => toast.error(error.message),
    });
}
