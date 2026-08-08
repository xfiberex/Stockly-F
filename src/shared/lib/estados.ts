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
    label: string;
    variant: BadgeVariant;
    Icon: React.ElementType;
}

// ── Nivel de stock ────────────────────────────────────────────────────────────
// Solo se marcan las excepciones. Un producto con stock correcto no lleva icono:
// la ausencia de marca también es distinguible en escala de grises, y pintar un
// visto en cada fila sana ahogaría precisamente a las filas que piden atención.

export type NivelStock = "correcto" | "bajo" | "agotado";

export const NIVEL_STOCK: Record<NivelStock, Estado> = {
    correcto: { label: "Correcto", variant: "success", Icon: CheckCircleIcon },
    bajo: { label: "Bajo", variant: "warning", Icon: ExclamationTriangleIcon },
    agotado: { label: "Agotado", variant: "danger", Icon: XCircleIcon },
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
    activo: { label: "Activo", variant: "success", Icon: CheckCircleIcon },
    inactivo: { label: "Inactivo", variant: "danger", Icon: NoSymbolIcon },
} satisfies Record<string, Estado>;

// ── Estado de orden ───────────────────────────────────────────────────────────
// Las etiquetas concuerdan en género con el sustantivo de cada módulo («la orden
// de compra» / «el pedido de venta»), así que cada uno tiene su mapa; el icono y
// el color son los mismos para el mismo estado.

export const ESTADO_ORDEN_COMPRA = {
    PENDING: { label: "Pendiente", variant: "warning", Icon: ClockIcon },
    RECEIVED: { label: "Recibida", variant: "success", Icon: CheckCircleIcon },
    CANCELLED: { label: "Cancelada", variant: "danger", Icon: XCircleIcon },
} satisfies Record<string, Estado>;

export const ESTADO_ORDEN_VENTA = {
    PENDING: { label: "Pendiente", variant: "warning", Icon: ClockIcon },
    SHIPPED: { label: "Enviado", variant: "success", Icon: TruckIcon },
    CANCELLED: { label: "Cancelado", variant: "danger", Icon: XCircleIcon },
} satisfies Record<string, Estado>;

/**
 * Un estado que la API añada y la interfaz todavía no conozca cae en la variante
 * neutra, con su código en crudo y un icono de interrogación: se ve que existe y
 * que no se sabe qué es, en lugar de heredar el color del último estado conocido.
 */
export function buscarEstado(mapa: Record<string, Estado>, clave: string): Estado {
    return mapa[clave] ?? { label: clave, variant: "neutral", Icon: QuestionMarkCircleIcon };
}

// ── Tipo de movimiento de stock ───────────────────────────────────────────────
// Entrada y salida son las dos direcciones del stock; ajuste e importación no
// mueven mercancía real, así que no compiten con ellas por el color.

export const TIPO_MOVIMIENTO: Record<StockMovementType, Estado> = {
    IN: { label: "Entrada", variant: "success", Icon: ArrowDownTrayIcon },
    OUT: { label: "Salida", variant: "danger", Icon: ArrowUpTrayIcon },
    ADJUSTMENT: { label: "Ajuste", variant: "info", Icon: AdjustmentsHorizontalIcon },
    IMPORT: { label: "Importación", variant: "neutral", Icon: DocumentArrowUpIcon },
};
