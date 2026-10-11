import { nivelEn, type NivelDeStock } from "@/shared/contratos";

/** Lo que un producto necesita traer para preguntar por un almacén: sus totales y su desglose. */
interface ConNiveles {
    stock: number;
    availableStock: number;
    stockLevels?: ReadonlyArray<NivelDeStock>;
}

/**
 * T5-14 — lo **disponible** de un producto: en un almacén, si se dice cuál, o en todos.
 *
 * Es la cifra contra la que un formulario valida la cantidad de una venta o de una
 * transferencia. Con un solo almacén no se pasa ninguno y vale lo de siempre; con varios, lo
 * que hay en otro local no cuenta, y el servidor rechazaría la petición.
 */
export function disponibleEn(producto: ConNiveles, warehouseId?: string): number {
    return warehouseId ? nivelEn(producto, warehouseId).availableStock : producto.availableStock;
}

/** T5-14 — lo que **hay** de un producto en un almacén, o en todos: lo físico, sin restar lo comprometido. */
export function stockEn(producto: Pick<ConNiveles, "stock" | "stockLevels">, warehouseId?: string): number {
    return warehouseId ? nivelEn(producto, warehouseId).stock : producto.stock;
}
