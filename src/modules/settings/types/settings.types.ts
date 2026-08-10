// T4-01 — `SettingEntry` declaraba `value: boolean | string | number`, la unión laxa que
// admite `{ type: "boolean", value: "false" }`: el defecto exacto de T1-06, donde el
// interruptor se pintaba apagado con el ajuste encendido porque `"false"` es una cadena
// verdadera. T2-24 endureció su espejo en los tests pero no este tipo, así que la forma
// mala seguía siendo representable. Ahora es la unión discriminada del contrato.
import type { Ajuste, AjusteGuardado } from "@/shared/contratos";

export type SettingEntry = Ajuste;
export type SettingType = SettingEntry["type"];

/** El valor de un ajuste **cualquiera**. Dentro de un `SettingEntry` va correlacionado
 *  con su `type`; esto es para cuando se manejan sueltos, como en el lote de cambios. */
export type SettingValue = AjusteGuardado["value"];

export type SettingUpdates = Record<string, SettingValue>;
