export type SettingType = "boolean" | "string" | "number";

export interface SettingEntry {
    key: string;
    label: string;
    description: string;
    type: SettingType;
    value: string;
    defaultValue: string;
}

export type SettingUpdates = Record<string, string>;
