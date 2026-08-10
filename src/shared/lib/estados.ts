import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    NoSymbolIcon,
    ClockIcon,
    TruckIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    AdjustmentsHorizontalIcon,
    DocumentArrowUpIcon,
    QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import type { BadgeVariant } from "@/shared/components/Badge";
import type { StockMovementType } from "@/modules/products/types/product.types";
import type { Clave } from "@/shared/i18n/traducir";

/**
 * Descriptores de estado (T2-38).
 *
 * Cada estado de la aplicación se comunica con **tres** señales redundantes:
 * texto, color e icono. El color solo nunca basta —WCAG 1.4.1—, y en un gestor
 * de inventario los estados son justamente la información crítica: si un
 * usuario con deficiencia de visión cromática no distingue «recibida» de
 * «cancelada», la pantalla no le sirve.
 *
 * Viven juntos aquí para que el icono no pueda separarse del color: quien añada
 * un estado nuevo tiene que elegir los dos en el mismo sitio, y `estados.test.tsx`
 * comprueba que dos estados del mismo conjunto no compartan icono.
 */
export interface Estado {
    /**
     * La **clave** del catálogo, no el texto (T4-04). El descriptor se construye en
     * tiempo de módulo y el idioma se elige en tiempo de render, así que aquí no puede
     * haber una cadena ya traducida: cambiar de idioma no volvería a ejecutar esto.
     * Quien pinta es `EstadoBadge`, que es el único sitio que llama a `t()`.
     */
    clave: Clave;
    variant: BadgeVariant;
    Icon: React.ElementType;
}

// ── Nivel de stock ────────────────────────────────────────────────────────────
// Solo se marcan las excepciones. Un producto con stock correcto no lleva icono:
// la ausencia de marca también es distinguible en escala de grises, y pintar un
// visto en cada fila sana ahogaría precisamente a las filas que piden atención.

export type NivelStock = "correcto" | "bajo" | "agotado";

export const NIVEL_STOCK: Record<NivelStock, Estado> = {
    correcto: { clave: "estado.stock.correcto", variant: "success", Icon: CheckCircleIcon },
    bajo: { clave: "estado.stock.bajo", variant: "warning", Icon: ExclamationTriangleIcon },
    agotado: { clave: "estado.stock.agotado", variant: "danger", Icon: XCircleIcon },
};

/** Agotado tiene prioridad sobre bajo: cero es un caso distinto, no un extremo. */
export function nivelDeStock(stock: number, minStock: number | null | undefined): NivelStock {
    if (stock === 0) return "agotado";
    if (stock <= (minStock ?? 0)) return "bajo";
    return "correcto";
}

// ── Actividad (productos y usuarios) ──────────────────────────────────────────
// Vale para cualquier entidad con baja lógica: el estado significa lo mismo y no
// hay razón para que un producto dado de baja y un usuario desactivado se pinten
// distinto.

export const ACTIVIDAD = {
    activo: { clave: "estado.actividad.activo", variant: "success", Icon: CheckCircleIcon },
    inactivo: { clave: "estado.actividad.inactivo", variant: "danger", Icon: NoSymbolIcon },
} satisfies Record<string, Estado>;

// ── Estado de orden ───────────────────────────────────────────────────────────
// Las etiquetas concuerdan en género con el sustantivo de cada módulo («la orden
// de compra» / «el pedido de venta»), así que cada uno tiene su mapa; el icono y
// el color son los mismos para el mismo estado.

export const ESTADO_ORDEN_COMPRA = {
    PENDING: { clave: "estado.compra.PENDING", variant: "warning", Icon: ClockIcon },
    RECEIVED: { clave: "estado.compra.RECEIVED", variant: "success", Icon: CheckCircleIcon },
    CANCELLED: { clave: "estado.compra.CANCELLED", variant: "danger", Icon: XCircleIcon },
} satisfies Record<string, Estado>;

export const ESTADO_ORDEN_VENTA = {
    PENDING: { clave: "estado.venta.PENDING", variant: "warning", Icon: ClockIcon },
    SHIPPED: { clave: "estado.venta.SHIPPED", variant: "success", Icon: TruckIcon },
    CANCELLED: { clave: "estado.venta.CANCELLED", variant: "danger", Icon: XCircleIcon },
} satisfies Record<string, Estado>;

/**
 * Un estado que la API añada y la interfaz todavía no conozca cae en la variante
 * neutra, con su código en crudo y un icono de interrogación: se ve que existe y
 * que no se sabe qué es, en lugar de heredar el color del último estado conocido.
 */
export function buscarEstado(mapa: Record<string, Estado>, clave: string): Estado {
    // El código en crudo pasa por `clave` sin estar en el catálogo, y eso es exactamente lo
    // que se quiere: `traducir()` devuelve la clave cuando no la encuentra, así que en
    // pantalla sigue apareciendo el código tal cual, como antes de T4-04.
    return mapa[clave] ?? { clave: clave as Clave, variant: "neutral", Icon: QuestionMarkCircleIcon };
}

// ── Tipo de movimiento de stock ───────────────────────────────────────────────
// Entrada y salida son las dos direcciones del stock; ajuste e importación no
// mueven mercancía real, así que no compiten con ellas por el color.

export const TIPO_MOVIMIENTO: Record<StockMovementType, Estado> = {
    IN: { clave: "estado.movimiento.IN", variant: "success", Icon: ArrowDownTrayIcon },
    OUT: { clave: "estado.movimiento.OUT", variant: "danger", Icon: ArrowUpTrayIcon },
    ADJUSTMENT: { clave: "estado.movimiento.ADJUSTMENT", variant: "info", Icon: AdjustmentsHorizontalIcon },
    IMPORT: { clave: "estado.movimiento.IMPORT", variant: "neutral", Icon: DocumentArrowUpIcon },
};
