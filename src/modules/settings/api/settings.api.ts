import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { SettingEntry, SettingUpdates } from "../types/settings.types";

export const getSettings = async (): Promise<SettingEntry[]> => {
    const { data } = await api.get<ApiResponse<SettingEntry[]>>("/settings");
    return data.data!;
};

export const updateSettings = async (updates: SettingUpdates): Promise<SettingEntry[]> => {
    const { data } = await api.patch<ApiResponse<SettingEntry[]>>("/settings", { updates });
    return data.data!;
};
