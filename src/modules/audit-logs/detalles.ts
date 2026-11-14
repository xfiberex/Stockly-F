import type { Traductor } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";
import { ESTADO_ORDEN_COMPRA, TIPO_MOVIMIENTO } from "@/shared/lib/estados";
import { ROL } from "@/modules/users/rol";
import { formatearImporte } from "@/shared/lib/moneda";
import type { AuditEntity } from "./types/audit-logs.types";

/**
 * AUD-017 — los detalles de una fila de la bitácora, como pares «qué: cuánto» en el idioma de la
 * pantalla. Antes se pintaba el JSON tal cual (`{"de":"PENDING","a":"WAREHOUSE"}`).
 *
 * Las claves son las que escribe cada `auditService.log` del backend, en un mapa literal: así el
 * catálogo de traducciones las ve escritas (`catalogo.test.ts`) y una que llegue sin rótulo se
 * enseña con su nombre, no se pierde.
 */
const ROTULO: Record<string, Clave> = {
    email: "auditoria.detalle.email",
    role: "auditoria.detalle.role",
    de: "auditoria.detalle.de",
    a: "auditoria.detalle.a",
    aprobada: "auditoria.detalle.aprobada",
    via: "auditoria.detalle.via",
    motivo: "auditoria.detalle.motivo",
    reason: "auditoria.detalle.motivo",
    lineas: "auditoria.detalle.lineas",
    categoria: "auditoria.detalle.categoria",
    items: "auditoria.detalle.items",
    name: "auditoria.detalle.name",
    type: "auditoria.detalle.type",
    quantity: "auditoria.detalle.quantity",
    lotId: "auditoria.detalle.lotId",
    status: "auditoria.detalle.status",
    origen: "auditoria.detalle.origen",
    destino: "auditoria.detalle.destino",
    unidades: "auditoria.detalle.unidades",
    ajustes: "auditoria.detalle.ajustes",
    sinContar: "auditoria.detalle.sinContar",
    isDefault: "auditoria.detalle.isDefault",
    // Los que escribe también el seed de demostración.
    sku: "auditoria.detalle.sku",
    price: "auditoria.detalle.price",
    productos: "auditoria.detalle.items",
    delta: "auditoria.detalle.delta",
    note: "auditoria.detalle.note",
    customerName: "auditoria.detalle.customerName",
    ip: "auditoria.detalle.ip",
};

/** `label` es la etiqueta guardada al borrar: ya sale en la columna de la entidad. */
const OCULTOS = new Set(["label"]);

const esCambio = (valor: object): valor is { de: unknown; a: unknown } =>
    !Array.isArray(valor) && Object.keys(valor).length === 2 && "de" in valor && "a" in valor;

/** Los valores que son un enum se dicen con su rótulo («Almacén», no `WAREHOUSE`). */
function valorDe(campo: string, valor: unknown, traductor: Traductor): string {
    const { t } = traductor;
    if (valor === null || valor === undefined || valor === "") return "—";
    if (typeof valor === "boolean") return t(valor ? "comun.si" : "comun.no");
    if (Array.isArray(valor)) return String(valor.length);
    // Un cambio (`{ de, a }`) se lee «antes → después», no como un objeto.
    if (typeof valor === "object" && esCambio(valor)) return `${valorDe(campo, valor.de, traductor)} → ${valorDe(campo, valor.a, traductor)}`;
    if (typeof valor === "object") return JSON.stringify(valor);
    if (campo === "price" && typeof valor === "number") return formatearImporte(valor);
    const texto = String(valor);
    if ((campo === "role" || campo === "de" || campo === "a") && texto in ROL) return t(ROL[texto as keyof typeof ROL].clave);
    if (campo === "type" && texto in TIPO_MOVIMIENTO) return t(TIPO_MOVIMIENTO[texto as keyof typeof TIPO_MOVIMIENTO].clave);
    if (campo === "status" && texto in ESTADO_ORDEN_COMPRA) return t(ESTADO_ORDEN_COMPRA[texto as keyof typeof ESTADO_ORDEN_COMPRA].clave);
    if (campo === "origen" && texto === "REORDER_SUGGESTION") return t("auditoria.detalle.origen.sugerencias");
    return texto;
}

/**
 * Los detalles como pares. `etiqueta` es el nombre que ya sale en la columna de la entidad: un
 * detalle que dice lo mismo (el `name` de un producto creado) no se repite al lado.
 */
export function paresDeDetalles(
    details: unknown,
    traductor: Traductor,
    etiqueta: string | null = null,
): Array<{ clave: string; rotulo: string; valor: string }> {
    if (!details || typeof details !== "object" || Array.isArray(details)) return [];
    return Object.entries(details as Record<string, unknown>)
        .filter(([campo, valor]) => !OCULTOS.has(campo) && !(etiqueta !== null && valor === etiqueta))
        .map(([campo, valor]) => ({
            clave: campo,
            rotulo: ROTULO[campo] ? traductor.t(ROTULO[campo]) : campo,
            valor: valorDe(campo, valor, traductor),
        }));
}

/**
 * AUD-017 — adónde lleva el nombre de una fila, si lleva a algún sitio. Las órdenes no tienen
 * página propia: se abre su listado ya filtrado a ella y desplegada.
 */
export function destinoDe(entity: AuditEntity, id: string, etiqueta: string | null): string | null {
    switch (entity) {
        case "Product": return `/catalog/products/${id}/movements`;
        case "Customer": return `/customers/${id}`;
        case "InventoryCount": return `/inventory-counts/${id}`;
        case "SaleOrder": return etiqueta ? `/sale-orders?numero=${Number(etiqueta)}&venta=${id}` : `/sale-orders?venta=${id}`;
        case "PurchaseOrder": return `/purchase-orders?compra=${id}`;
        case "User": return etiqueta ? `/admin/users?buscar=${encodeURIComponent(etiqueta)}` : "/admin/users";
        case "Warehouse": return "/warehouses";
        case "StockTransfer": return "/stock-transfers";
        case "Category": return "/catalog/categories";
        case "Brand": return "/catalog/brands";
        case "Supplier": return "/catalog/suppliers";
        case "Tag": return "/catalog/tags";
    }
}
