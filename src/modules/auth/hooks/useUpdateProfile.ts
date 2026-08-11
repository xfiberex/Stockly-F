import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { AuthAPI } from "@/modules/auth/api/auth.api";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { UpdateProfileForm } from "@/modules/auth/schemas/auth.schema";

export function useUpdateProfile() {
    const qc = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (form: UpdateProfileForm) => AuthAPI.updateProfile(form),
        onSuccess: (data) => {
            // `emailChanged` es lo que decide el aviso, no el `message` del servidor:
            // el dato viaja tipado en el contrato y la frase se pone aquí (T4-04).
            if (data.emailChanged) {
                // Si cambió el email, la sesión queda pendiente de reverificación
                toast.info(t("auth.perfil.correoCambiado"));
                qc.removeQueries({ queryKey: queryKeys.user });
            } else {
                qc.invalidateQueries({ queryKey: queryKeys.user });
                toast.success(t("auth.perfil.actualizado"));
            }
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
