import type { ComponentType, SVGProps } from "react";
import {
    ShieldCheckIcon,
    ClipboardDocumentListIcon,
    ClipboardDocumentCheckIcon,
    Squares2X2Icon,
    HomeIcon,
    BanknotesIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";
import type { Rol } from "@/shared/contratos";
import type { Clave } from "@/shared/i18n/traducir";

/**
 * AUD-016 — la navegación de cada rol, escrita entera.
 *
 * Hasta ahora había una lista para todos y tres excepciones sueltas (`soloAdmin` en un grupo,
 * `permiso` en el mostrador, `ocultoPara` en el panel). Con cuatro roles ya no alcanzaba: un
 * SELLER veía 16 destinos para usar cuatro, y los tres de WAREHOUSE empezaban a ~600 px en el
 * menú del móvil, debajo de un catálogo que solo consulta.
 *
 * **Derivarlo de `PERMISOS` no sirve**: casi todas las lecturas son de todos los roles, así que
 * la matriz diría que SELLER puede abrir Almacenes —y puede—, no que le haga falta. Lo que un
 * rol necesita tener a mano es una decisión de producto, y aquí está escrita: una lista por rol,
 * en el orden en que se pinta. Los grupos aparecen donde aparece su primer destino. Lo que no
 * está en la lista de un rol sigue abriéndose por URL si la ruta se lo permite: esto ordena el
 * menú, no protege nada (eso lo hacen `ProtectedRoute` y la API).
 *
 * T3-04 y T4-10 — **un solo orden**, el de la lista: lo pintan igual el menú del móvil y la barra
 * lateral, así que un destino nuevo aparece en los dos sitios sin tocar nada más.
 *
 * T4-04: `label` es la **clave** del catálogo, no el rótulo, para que el idioma se decida al
 * pintar. Los destinos reutilizan las claves `ruta.*`.
 */

type Icono = ComponentType<SVGProps<SVGSVGElement>>;

export type GrupoDeNav = "catalogo" | "ordenes" | "inventario" | "admin";

/** T4-10 — un subtítulo con sus destinos debajo, siempre desplegado. */
export const GRUPOS: Record<GrupoDeNav, { label: Clave; Icon: Icono }> = {
    catalogo: { label: "ruta.catalogo", Icon: Squares2X2Icon },
    ordenes: { label: "nav.ordenes", Icon: ClipboardDocumentListIcon },
    inventario: { label: "nav.inventario", Icon: ClipboardDocumentCheckIcon },
    admin: { label: "nav.admin", Icon: ShieldCheckIcon },
};

type Destino = { label: Clave; grupo: GrupoDeNav } | { label: Clave; Icon: Icono; end: boolean };

export const DESTINOS = {
    "/": { label: "ruta.dashboard", Icon: HomeIcon, end: true },
    // T6-08 — lo que abre a todas horas quien vende.
    "/counter": { label: "ruta.mostrador", Icon: BanknotesIcon, end: false },
    "/catalog/products": { label: "ruta.productos", grupo: "catalogo" },
    "/catalog/categories": { label: "ruta.categorias", grupo: "catalogo" },
    "/catalog/brands": { label: "ruta.marcas", grupo: "catalogo" },
    "/catalog/suppliers": { label: "ruta.proveedores", grupo: "catalogo" },
    "/catalog/tags": { label: "ruta.etiquetas", grupo: "catalogo" },
    "/purchase-orders": { label: "nav.compra", grupo: "ordenes" },
    "/sale-orders": { label: "nav.venta", grupo: "ordenes" },
    // T5-06 — a quién se vende, junto a las ventas.
    "/customers": { label: "ruta.clientes", grupo: "ordenes" },
    // T5-07, T5-14, T5-15 — dónde está el stock y qué hay que hacer con él.
    "/inventory-counts": { label: "ruta.conteos", grupo: "inventario" },
    "/stock-transfers": { label: "ruta.transferencias", grupo: "inventario" },
    "/expiry": { label: "ruta.caducidades", grupo: "inventario" },
    "/warehouses": { label: "ruta.almacenes", grupo: "inventario" },
    "/reports": { label: "ruta.reportes", Icon: ChartBarIcon, end: false },
    "/admin/users": { label: "ruta.usuarios", grupo: "admin" },
    "/audit-logs": { label: "nav.auditoria", grupo: "admin" },
    "/settings": { label: "ruta.configuracion", grupo: "admin" },
} as const satisfies Record<string, Destino>;

export type RutaDeNav = keyof typeof DESTINOS;

const TODO_MENOS_ADMINISTRACION = [
    "/",
    "/catalog/products",
    "/catalog/categories",
    "/catalog/brands",
    "/catalog/suppliers",
    "/catalog/tags",
    "/purchase-orders",
    "/sale-orders",
    "/customers",
    "/inventory-counts",
    "/stock-transfers",
    "/expiry",
    "/warehouses",
    "/reports",
] as const satisfies readonly RutaDeNav[];

/** El menú de cada rol, en su orden. El compilador exige una entrada por rol. */
export const NAVEGACION_POR_ROL: Record<Rol, readonly RutaDeNav[]> = {
    ADMIN: [
        "/",
        "/counter",
        ...TODO_MENOS_ADMINISTRACION.slice(1),
        "/admin/users",
        "/audit-logs",
        "/settings",
    ],
    // El rol de consulta lo lee todo; no tiene mostrador ni administración.
    USER: TODO_MENOS_ADMINISTRACION,
    // Lo del almacén primero: contar, transferir, retirar lo que caduca; después recibir compras
    // y enviar ventas, y el catálogo solo para buscar un producto. Categorías, marcas,
    // proveedores, etiquetas y clientes los consulta poco y no los cambia.
    WAREHOUSE: [
        "/",
        "/inventory-counts",
        "/stock-transfers",
        "/expiry",
        "/warehouses",
        "/purchase-orders",
        "/sale-orders",
        "/catalog/products",
        "/reports",
    ],
    // AUD-008 — sin panel: entra en el mostrador. Sus ventas, sus clientes y el precio de un
    // producto; nada más que le haga falta a diario.
    SELLER: ["/counter", "/sale-orders", "/customers", "/catalog/products"],
    // AUD-001 — sin rol no se puede nada (y no llega a ver el marco).
    PENDING: [],
};

export type SeccionDeNav =
    | { kind: "link"; to: RutaDeNav; label: Clave; Icon: Icono; end: boolean }
    | { kind: "group"; grupo: GrupoDeNav; label: Clave; Icon: Icono; items: { to: RutaDeNav; label: Clave }[] };

/** Las secciones del menú de un rol: los enlaces sueltos y los grupos, en el orden de su lista. */
export function navegacionDe(rol: Rol | undefined): SeccionDeNav[] {
    const secciones: SeccionDeNav[] = [];
    for (const to of rol ? NAVEGACION_POR_ROL[rol] : []) {
        const destino: Destino = DESTINOS[to];
        if ("grupo" in destino) {
            const existente = secciones.find((s) => s.kind === "group" && s.grupo === destino.grupo);
            if (existente && existente.kind === "group") existente.items.push({ to, label: destino.label });
            else secciones.push({ kind: "group", grupo: destino.grupo, ...GRUPOS[destino.grupo], items: [{ to, label: destino.label }] });
        } else {
            secciones.push({ kind: "link", to, label: destino.label, Icon: destino.Icon, end: destino.end });
        }
    }
    return secciones;
}
