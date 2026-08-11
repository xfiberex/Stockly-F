import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getSettings, updateSettings } from "../api/settings.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { SettingUpdates } from "../types/settings.types";

export const SETTINGS_KEY = ["settings"] as const;

export function useSettings() {
    return useQuery({ queryKey: SETTINGS_KEY, queryFn: getSettings });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    const { t, idioma } = useT();

    return useMutation({
        mutationFn: (updates: SettingUpdates) => updateSettings(updates),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: SETTINGS_KEY });
            toast.success(t("configuracion.guardada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
