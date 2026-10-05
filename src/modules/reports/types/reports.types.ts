// T4-01 — los tipos de reportes salen del contrato. Ojo con la excepción que documenta
// `api.ts`: `reports.service.ts` convierte los importes con `Number(...)` antes de
// responder, así que aquí `price` sí es un número, al revés que en `/products`.
import type {
    AtajoDePeriodo,
    ClaseAbc,
    InformePorPeriodo,
    MargenRealizado,
    ResumenAbc,
    ResumenReporte,
} from "@/shared/contratos";

export type ReportSummary = ResumenReporte;
/** T5-02 — margen de las ventas enviadas en la ventana del informe. */
export type ProfitMargin = MargenRealizado;
/** T5-09 — ventas enviadas y compras recibidas de un periodo. */
export type PeriodReport = InformePorPeriodo;
export type PeriodPreset = AtajoDePeriodo;
/** T5-10 — periodo de la clasificación ABC y productos por clase. */
export type AbcSummary = ResumenAbc;
export type AbcClass = ClaseAbc;
