import { matchPath } from "react-router-dom";
import type { Clave } from "@/shared/i18n/traducir";

// T2-18: en una SPA la navegación no recarga la página, así que el lector de pantalla
// no anuncia nada al cambiar de sección. Para poder decir «has llegado a Reportes» hace
// falta un nombre por ruta, y este es el único sitio donde vive.
//
// No se lee del `<h1>` de cada página: con las rutas en `lazy()`, en el instante del
// cambio de ruta el contenido nuevo todavía no está montado y no habría nada que leer.
// `rutas.test.ts` comprueba que esta lista y el router no se separen.

// T4-04: lo que se guarda es la **clave** del catálogo, no el texto. `AnuncioDeRuta` es
// quien traduce, porque el idioma se decide al pintar y esta lista se construye al cargar
// el módulo.
export const TITULO_POR_DEFECTO: Clave = "ruta.noEncontrada";

export const TITULOS_DE_RUTA: ReadonlyArray<{ patron: string; titulo: Clave }> = [
    { patron: "/", titulo: "ruta.dashboard" },
    { patron: "/profile", titulo: "ruta.perfil" },
    { patron: "/reports", titulo: "ruta.reportes" },
    { patron: "/purchase-orders", titulo: "ruta.ordenesCompra" },
    { patron: "/sale-orders", titulo: "ruta.ordenesVenta" },
    { patron: "/audit-logs", titulo: "ruta.auditoria" },
    { patron: "/settings", titulo: "ruta.configuracion" },
    { patron: "/admin/users", titulo: "ruta.usuarios" },
    { patron: "/catalog", titulo: "ruta.catalogo" },
    { patron: "/catalog/products", titulo: "ruta.productos" },
    { patron: "/catalog/products/:id/movements", titulo: "ruta.movimientos" },
    { patron: "/catalog/categories", titulo: "ruta.categorias" },
    { patron: "/catalog/brands", titulo: "ruta.marcas" },
    { patron: "/catalog/suppliers", titulo: "ruta.proveedores" },
    { patron: "/catalog/tags", titulo: "ruta.etiquetas" },
    { patron: "/auth/login", titulo: "ruta.login" },
    { patron: "/auth/register", titulo: "ruta.registro" },
    { patron: "/auth/forgot-password", titulo: "ruta.recuperar" },
    { patron: "/auth/reset-password", titulo: "ruta.nuevaContrasena" },
    { patron: "/auth/confirm-account", titulo: "ruta.confirmarCuenta" },
    { patron: "/auth/resend-verification", titulo: "ruta.reenviarVerificacion" },
];

/**
 * Título de la sección a la que corresponde una ruta.
 *
 * La comparación es exacta (`end: true`), así que `/catalog` no se come a
 * `/catalog/products` y no hace falta ordenar la lista por especificidad.
 */
export function tituloDeRuta(pathname: string): Clave {
    const encontrado = TITULOS_DE_RUTA.find(({ patron }) => matchPath({ path: patron, end: true }, pathname));
    return encontrado?.titulo ?? TITULO_POR_DEFECTO;
}
