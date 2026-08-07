export type SettingType = "boolean" | "string" | "number";

// El backend devuelve el valor ya parseado según el `type` del catálogo
// (`settings.service.ts:parseValue`): boolean para los ajustes booleanos, number
// para los numéricos y string para el resto. No es una cadena siempre.
export type SettingValue = boolean | string | number;

export interface SettingEntry {
    key: string;
    label: string;
    description: string;
    type: SettingType;
    value: SettingValue;
}

export type SettingUpdates = Record<string, SettingValue>;
