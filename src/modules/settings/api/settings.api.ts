import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { Negocio } from "@/shared/contratos";
import type { SettingEntry, SettingUpdates } from "../types/settings.types";

export const getSettings = async (): Promise<SettingEntry[]> => {
    const { data } = await api.get<ApiResponse<SettingEntry[]>>("/settings");
    return data.data!;
};

// El backend recorre el cuerpo con `Object.entries(req.body)` y descarta las claves
// que no estén en el catálogo (`settings.controller.ts:14`). Enviar `{ updates }`
// hacía que la única clave fuese "updates" y no se persistiera nada, con un 200 de
// respuesta: por eso el fallo pasó desapercibido. Va el objeto plano.
export const updateSettings = async (updates: SettingUpdates): Promise<SettingEntry[]> => {
    const { data } = await api.patch<ApiResponse<SettingEntry[]>>("/settings", updates);
    return data.data!;
};

/** T6-03 — quién vende y en qué moneda. Lo lee cualquier rol; `GET /settings`, solo `ADMIN`. */
export const getNegocio = async (signal?: AbortSignal): Promise<Negocio> => {
    const { data } = await api.get<ApiResponse<Negocio>>("/settings/business", { signal });
    return data.data!;
};

export const subirLogo = async (archivo: File): Promise<Negocio> => {
    const form = new FormData();
    form.append("logo", archivo);
    const { data } = await api.put<ApiResponse<Negocio>>("/settings/logo", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data!;
};

export const quitarLogo = async (): Promise<Negocio> => {
    const { data } = await api.delete<ApiResponse<Negocio>>("/settings/logo");
    return data.data!;
};
