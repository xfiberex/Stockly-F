import type { es } from "@/shared/i18n/es";

/**
 * Catálogo inglés (T4-04).
 *
 * El tipo es `Record<keyof typeof es, string>` **a propósito**: una clave que falte no compila
 * y una que sobre tampoco. No hace falta ninguna herramienta de sincronización — la hace el
 * compilador, igual que con el contrato de T4-01.
 *
 * Traducir no es sustituir palabra por palabra. Dos casos que se ven abajo:
 *
 * - **Los géneros del español desaparecen.** «Recibida»/«Cancelado» son formas distintas
 *   porque concuerdan con «orden» y «pedido»; en inglés las dos son la misma palabra. Las
 *   claves siguen separadas porque el idioma de referencia las necesita, no al revés.
 * - **«Dashboard» no se traduce**, ni siquiera al inglés: es el nombre de la sección y ya
 *   estaba en inglés en la interfaz original.
 */
export const en: Record<keyof typeof es, string> = {
    // ── Common ───────────────────────────────────────────────────────────────
    "comun.guardar": "Save",
    "comun.guardarCambios": "Save changes",
    "comun.cancelar": "Cancel",
    "comun.cerrar": "Close",
    "comun.crear": "Create",
    "comun.editar": "Edit",
    "comun.eliminar": "Delete",
    "comun.restaurar": "Restore",
    "comun.buscar": "Search",
    "comun.filtrar": "Filter",
    "comun.limpiar": "Clear",
    "comun.aceptar": "OK",
    "comun.volver": "Back",
    "comun.cargando": "Loading…",
    "comun.sinResultados": "No results",
    "comun.acciones": "Actions",
    "comun.estado": "Status",
    "comun.nombre": "Name",
    "comun.descripcion": "Description",
    "comun.fecha": "Date",
    "comun.total": "Total",
    "comun.todos": "All",
    "comun.si": "Yes",
    "comun.no": "No",
    "comun.anterior": "Previous",
    "comun.siguiente": "Next",

    // ── Status descriptors ───────────────────────────────────────────────────
    "estado.stock.correcto": "OK",
    "estado.stock.bajo": "Low",
    "estado.stock.agotado": "Out of stock",
    "estado.actividad.activo": "Active",
    "estado.actividad.inactivo": "Inactive",
    "estado.compra.PENDING": "Pending",
    "estado.compra.RECEIVED": "Received",
    "estado.compra.CANCELLED": "Cancelled",
    "estado.venta.PENDING": "Pending",
    "estado.venta.SHIPPED": "Shipped",
    "estado.venta.CANCELLED": "Cancelled",
    "estado.movimiento.IN": "Inbound",
    "estado.movimiento.OUT": "Outbound",
    "estado.movimiento.ADJUSTMENT": "Adjustment",
    "estado.movimiento.IMPORT": "Import",

    // ── Route titles ─────────────────────────────────────────────────────────
    "ruta.dashboard": "Dashboard",
    "ruta.perfil": "My profile",
    "ruta.reportes": "Reports",
    "ruta.ordenesCompra": "Purchase orders",
    "ruta.ordenesVenta": "Sales orders",
    "ruta.auditoria": "Audit log",
    "ruta.configuracion": "Settings",
    "ruta.usuarios": "Users",
    "ruta.catalogo": "Catalog",
    "ruta.productos": "Products",
    "ruta.movimientos": "Stock movements",
    "ruta.categorias": "Categories",
    "ruta.marcas": "Brands",
    "ruta.proveedores": "Suppliers",
    "ruta.etiquetas": "Tags",
    "ruta.login": "Sign in",
    "ruta.registro": "Create account",
    "ruta.recuperar": "Recover password",
    "ruta.nuevaContrasena": "New password",
    "ruta.confirmarCuenta": "Confirm account",
    "ruta.reenviarVerificacion": "Resend verification",
    "ruta.noEncontrada": "Page not found",

    // ── 404 ──────────────────────────────────────────────────────────────────
    "noEncontrada.detalle": "The page you are looking for does not exist.",
    "noEncontrada.volver": "Back to Dashboard",

    // ── Settings → Appearance ────────────────────────────────────────────────
    "configuracion.titulo": "Settings",
    "configuracion.subtitulo": "Preferences for this device, and application settings",
    "configuracion.apariencia": "Appearance",
    "configuracion.ajustes": "Application settings",
    "configuracion.ajustesAyuda": "These affect every user",
    "apariencia.tema.titulo": "Theme",
    "apariencia.tema.ayuda": "Applied instantly, and remembered on this device only.",
    "apariencia.tema.auto": "Automatic",
    "apariencia.tema.autoAyuda": "Follows the system preference",
    "apariencia.tema.claro": "Light",
    "apariencia.tema.claroAyuda": "Always light",
    "apariencia.tema.oscuro": "Dark",
    "apariencia.tema.oscuroAyuda": "Always dark",
    "apariencia.idioma.titulo": "Language",
    "apariencia.idioma.ayuda": "Applied instantly, and remembered on this device only.",
    "apariencia.idioma.auto": "Automatic",
    "apariencia.idioma.autoAyuda": "Follows the browser language",

    // ── Product import ───────────────────────────────────────────────────────
    "importacion.filasConError_one": "{cantidad} row with errors skipped",
    "importacion.filasConError_other": "{cantidad} rows with errors skipped",

    // ── API errors ───────────────────────────────────────────────────────────
    "error.generico": "Something went wrong. Please try again.",
    "error.red": "Could not reach the server.",
    "error.ACCOUNT_NOT_FOUND_OR_VERIFIED": "Account not found, or already verified",
    "error.CANNOT_CANCEL_UNITS_CONSUMED": "Cannot cancel: the units received of \u201c{producto}\u201d have already been used. Available: {disponible}, required: {requerido}",
    "error.CANNOT_CHANGE_OWN_ROLE": "You cannot change your own role",
    "error.CANNOT_DEACTIVATE_OWN_ACCOUNT": "You cannot deactivate your own account",
    "error.CANNOT_DELETE_RECEIVED_ORDER": "A received order cannot be deleted",
    "error.CANNOT_DELETE_SHIPPED_ORDER": "A shipped order cannot be deleted",
    "error.CANNOT_MODIFY_CANCELLED_ORDER": "A cancelled order cannot be modified",
    "error.INACTIVE_PRODUCT_MOVEMENT": "Stock movements cannot be recorded for an inactive product",
    "error.INSUFFICIENT_STOCK": "Not enough stock for \u201c{producto}\u201d. Available: {disponible}, required: {requerido}",
    "error.INVALID_FILTER_VALUE": "Filter \u201c{campo}\u201d does not accept the value \u201c{valor}\u201d. Valid values: {validos}.",
    "error.INVALID_OR_EXPIRED_TOKEN": "Invalid or expired token",
    "error.ORDER_ALREADY_SHIPPED": "The order has already been shipped",
    "error.PRODUCT_ALREADY_ACTIVE": "The product is already active",
    "error.STOCK_CANNOT_BE_NEGATIVE": "Stock cannot go negative",
    "error.ACCOUNT_DISABLED": "Your account has been deactivated. Contact an administrator",
    "error.EMAIL_NOT_CONFIRMED": "Confirm your email address before signing in",
    "error.INVALID_CREDENTIALS": "Invalid credentials",
    "error.NOT_AUTHENTICATED": "Not signed in",
    "error.SESSION_EXPIRED": "Your session expired, please sign in again",
    "error.WRONG_CURRENT_PASSWORD": "The current password is incorrect",
    "error.BRAND_NOT_FOUND": "Brand not found",
    "error.CATEGORY_NOT_FOUND": "Category not found",
    "error.PRODUCT_NOT_FOUND": "Product not found",
    "error.PURCHASE_ORDER_NOT_FOUND": "Purchase order not found",
    "error.ROUTE_NOT_FOUND": "Route not found: {metodo} {ruta}",
    "error.SALE_ORDER_NOT_FOUND": "Sales order not found",
    "error.SUPPLIER_NOT_FOUND": "Supplier not found",
    "error.TAG_NOT_FOUND": "Tag not found",
    "error.USER_NOT_FOUND": "User not found",
    "error.BRAND_NAME_EXISTS": "A brand with that name already exists",
    "error.CATEGORY_NAME_EXISTS": "A category with that name already exists",
    "error.EMAIL_ALREADY_REGISTERED": "That email address is already registered",
    "error.EMAIL_IN_USE": "That email address is already used by another account",
    "error.SUPPLIER_EMAIL_EXISTS": "A supplier with that email address already exists",
    "error.TAG_NAME_EXISTS": "A tag with that name already exists",
    "error.EXPORT_TOO_LARGE": "The export has {filas} rows and the maximum is {maximo}. Narrow the filter first.",
    "error.INVALID_IMAGE_FILE": "The file is not a valid image. Accepted: {formatos}.",
    "error.EMAIL_NOT_CONFIGURED": "Email delivery is not configured on the server.",
    "error.UPLOAD_NOT_CONFIGURED": "Image uploads are not configured on the server.",
    "error.INTERNAL_ERROR": "Internal server error.",
    "error.RATE_LIMITED": "Too many requests. Wait a moment and try again.",
};
