import { matchPath } from "react-router-dom";

// T2-18: en una SPA la navegación no recarga la página, así que el lector de pantalla
// no anuncia nada al cambiar de sección. Para poder decir «has llegado a Reportes» hace
// falta un nombre por ruta, y este es el único sitio donde vive.
//
// No se lee del `<h1>` de cada página: con las rutas en `lazy()`, en el instante del
// cambio de ruta el contenido nuevo todavía no está montado y no habría nada que leer.
// `rutas.test.ts` comprueba que esta lista y el router no se separen.

export const TITULO_POR_DEFECTO = "Página no encontrada";

export const TITULOS_DE_RUTA: ReadonlyArray<{ patron: string; titulo: string }> = [
    { patron: "/", titulo: "Dashboard" },
    { patron: "/profile", titulo: "Mi perfil" },
    { patron: "/reports", titulo: "Reportes" },
    { patron: "/purchase-orders", titulo: "Órdenes de compra" },
    { patron: "/sale-orders", titulo: "Órdenes de venta" },
    { patron: "/audit-logs", titulo: "Registro de auditoría" },
    { patron: "/settings", titulo: "Configuración" },
    { patron: "/admin/users", titulo: "Usuarios" },
    { patron: "/catalog", titulo: "Catálogo" },
    { patron: "/catalog/products", titulo: "Productos" },
    { patron: "/catalog/products/:id/movements", titulo: "Movimientos de stock" },
    { patron: "/catalog/categories", titulo: "Categorías" },
    { patron: "/catalog/brands", titulo: "Marcas" },
    { patron: "/catalog/suppliers", titulo: "Proveedores" },
    { patron: "/catalog/tags", titulo: "Etiquetas" },
    { patron: "/auth/login", titulo: "Iniciar sesión" },
    { patron: "/auth/register", titulo: "Crear cuenta" },
    { patron: "/auth/forgot-password", titulo: "Recuperar contraseña" },
    { patron: "/auth/reset-password", titulo: "Nueva contraseña" },
    { patron: "/auth/confirm-account", titulo: "Confirmar cuenta" },
    { patron: "/auth/resend-verification", titulo: "Reenviar verificación" },
];

/**
 * Título de la sección a la que corresponde una ruta.
 *
 * La comparación es exacta (`end: true`), así que `/catalog` no se come a
 * `/catalog/products` y no hace falta ordenar la lista por especificidad.
 */
export function tituloDeRuta(pathname: string): string {
    const encontrado = TITULOS_DE_RUTA.find(({ patron }) => matchPath({ path: patron, end: true }, pathname));
    return encontrado?.titulo ?? TITULO_POR_DEFECTO;
}
