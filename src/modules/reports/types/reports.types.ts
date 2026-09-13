// T4-01 — los tipos de reportes salen del contrato. Ojo con la excepción que documenta
// `api.ts`: `reports.service.ts` convierte los importes con `Number(...)` antes de
// responder, así que aquí `price` sí es un número, al revés que en `/products`.
import type {
    MargenRealizado,
    MetricaStock,
    MovimientoPorMes,
    ProductoBajoStock,
    ProductoTop,
    ResumenReporte,
    StockPorCategoria,
    TotalesReporte,
} from "@/shared/contratos";

export type ReportTotals = TotalesReporte;
export type StockByCategory = StockPorCategoria;
export type TopProduct = ProductoTop;
export type MovementByMonth = MovimientoPorMes;
export type LowStockProduct = ProductoBajoStock;
export type StockMetric = MetricaStock;
export type ReportSummary = ResumenReporte;
/** T5-02 — margen de las ventas enviadas en la ventana del informe. */
export type ProfitMargin = MargenRealizado;
