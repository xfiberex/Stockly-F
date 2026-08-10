/**
 * Catálogo de referencia (T4-04). **Este archivo manda.**
 *
 * `en.ts` se declara como `Record<keyof typeof es, string>`, así que una clave nueva aquí que
 * no se traduzca allí **no compila**, y una clave sobrante allí tampoco. Es la misma idea que
 * el contrato de T4-01: una fuente de verdad y el compilador vigilando la copia.
 *
 * Convenciones, para que el catálogo siga siendo legible cuando tenga el doble de entradas:
 *
 * - **Prefijo por módulo** (`productos.`, `ventas.`, `auth.`), salvo `comun.` para lo que
 *   aparece en más de un módulo y `error.` para los códigos que devuelve la API.
 * - **La clave describe el sitio, no el texto.** `comun.guardar`, no `comun.guardar_cambios`:
 *   si mañana el botón dice «Aplicar», la clave sigue valiendo.
 * - **Interpolación con `{nombre}`**, nunca concatenando: el orden de las palabras cambia
 *   entre idiomas y una frase partida en trozos no se puede traducir.
 * - **Los plurales llevan sufijo `_one` / `_other`** y se piden con `tn()`. La cantidad entra
 *   siempre como `{cantidad}`.
 */
export const es = {
    // ── Común ────────────────────────────────────────────────────────────────
    "comun.guardar": "Guardar",
    "comun.guardarCambios": "Guardar cambios",
    "comun.cancelar": "Cancelar",
    "comun.cerrar": "Cerrar",
    "comun.crear": "Crear",
    "comun.editar": "Editar",
    "comun.eliminar": "Eliminar",
    "comun.restaurar": "Restaurar",
    "comun.buscar": "Buscar",
    "comun.filtrar": "Filtrar",
    "comun.limpiar": "Limpiar",
    "comun.aceptar": "Aceptar",
    "comun.volver": "Volver",
    "comun.cargando": "Cargando…",
    "comun.sinResultados": "No hay resultados",
    "comun.acciones": "Acciones",
    "comun.estado": "Estado",
    "comun.nombre": "Nombre",
    "comun.descripcion": "Descripción",
    "comun.fecha": "Fecha",
    "comun.total": "Total",
    "comun.todos": "Todos",
    "comun.si": "Sí",
    "comun.no": "No",
    "comun.anterior": "Anterior",
    "comun.siguiente": "Siguiente",

    // ── Estados (T2-38): texto, color e icono viajan juntos ───────────────────
    "estado.stock.correcto": "Correcto",
    "estado.stock.bajo": "Bajo",
    "estado.stock.agotado": "Agotado",
    "estado.actividad.activo": "Activo",
    "estado.actividad.inactivo": "Inactivo",
    // El género concuerda con el sustantivo de cada módulo: «la orden de compra»
    // frente a «el pedido de venta». En inglés los dos caen en la misma palabra,
    // y por eso el catálogo mantiene las claves separadas aunque allí coincidan.
    "estado.compra.PENDING": "Pendiente",
    "estado.compra.RECEIVED": "Recibida",
    "estado.compra.CANCELLED": "Cancelada",
    "estado.venta.PENDING": "Pendiente",
    "estado.venta.SHIPPED": "Enviado",
    "estado.venta.CANCELLED": "Cancelado",
    "estado.movimiento.IN": "Entrada",
    "estado.movimiento.OUT": "Salida",
    "estado.movimiento.ADJUSTMENT": "Ajuste",
    "estado.movimiento.IMPORT": "Importación",

    // ── Títulos de ruta (T2-18): los anuncia la región viva y el <title> ──────
    "ruta.dashboard": "Dashboard",
    "ruta.perfil": "Mi perfil",
    "ruta.reportes": "Reportes",
    "ruta.ordenesCompra": "Órdenes de compra",
    "ruta.ordenesVenta": "Órdenes de venta",
    "ruta.auditoria": "Registro de auditoría",
    "ruta.configuracion": "Configuración",
    "ruta.usuarios": "Usuarios",
    "ruta.catalogo": "Catálogo",
    "ruta.productos": "Productos",
    "ruta.movimientos": "Movimientos de stock",
    "ruta.categorias": "Categorías",
    "ruta.marcas": "Marcas",
    "ruta.proveedores": "Proveedores",
    "ruta.etiquetas": "Etiquetas",
    "ruta.login": "Iniciar sesión",
    "ruta.registro": "Crear cuenta",
    "ruta.recuperar": "Recuperar contraseña",
    "ruta.nuevaContrasena": "Nueva contraseña",
    "ruta.confirmarCuenta": "Confirmar cuenta",
    "ruta.reenviarVerificacion": "Reenviar verificación",
    "ruta.noEncontrada": "Página no encontrada",

    // ── Página 404 ───────────────────────────────────────────────────────────
    "noEncontrada.detalle": "La ruta que buscas no existe.",
    "noEncontrada.volver": "Volver al Dashboard",

    // ── Configuración → Apariencia (T4-11, T4-04) ────────────────────────────
    "configuracion.titulo": "Configuración",
    "configuracion.subtitulo": "Preferencias de este dispositivo y ajustes de la aplicación",
    "configuracion.apariencia": "Apariencia",
    "configuracion.ajustes": "Ajustes de la aplicación",
    "configuracion.ajustesAyuda": "Afectan a todos los usuarios",
    "apariencia.tema.titulo": "Tema",
    "apariencia.tema.ayuda": "Se aplica al instante y se recuerda solo en este dispositivo.",
    "apariencia.tema.auto": "Automático",
    "apariencia.tema.autoAyuda": "Sigue la preferencia del sistema",
    "apariencia.tema.claro": "Claro",
    "apariencia.tema.claroAyuda": "Siempre en claro",
    "apariencia.tema.oscuro": "Oscuro",
    "apariencia.tema.oscuroAyuda": "Siempre en oscuro",
    "apariencia.idioma.titulo": "Idioma",
    "apariencia.idioma.ayuda": "Se aplica al instante y se recuerda solo en este dispositivo.",
    "apariencia.idioma.auto": "Automático",
    "apariencia.idioma.autoAyuda": "Sigue el idioma del navegador",

    // ── Importación de productos ─────────────────────────────────────────────
    // El proyecto resolvía el plural a mano —`fila${n !== 1 ? "s" : ""}`— y ese truco no
    // sobrevive a un idioma más: en inglés la «s» va en otra palabra. Se piden con `tn()`.
    "importacion.filasConError_one": "{cantidad} fila con errores omitida",
    "importacion.filasConError_other": "{cantidad} filas con errores omitidas",

    // ── Errores que llegan de la API ─────────────────────────────────────────
    // La clave es el `code` del sobre de error; el `message` del backend solo se usa
    // como respaldo cuando el código no está traducido todavía.
    "error.generico": "Ha ocurrido un error. Inténtalo de nuevo.",
    "error.red": "No se pudo conectar con el servidor.",
    "error.ACCOUNT_NOT_FOUND_OR_VERIFIED": "Cuenta no encontrada o ya verificada",
    "error.CANNOT_CANCEL_UNITS_CONSUMED": "No se puede cancelar: las unidades recibidas de «{producto}» ya se consumieron. Disponible: {disponible}, requerido: {requerido}",
    "error.CANNOT_CHANGE_OWN_ROLE": "No puedes cambiar tu propio rol",
    "error.CANNOT_DEACTIVATE_OWN_ACCOUNT": "No puedes desactivar tu propia cuenta",
    "error.CANNOT_DELETE_RECEIVED_ORDER": "No se puede eliminar una orden ya recibida",
    "error.CANNOT_DELETE_SHIPPED_ORDER": "No se puede eliminar una orden ya enviada",
    "error.CANNOT_MODIFY_CANCELLED_ORDER": "No se puede modificar una orden cancelada",
    "error.INACTIVE_PRODUCT_MOVEMENT": "No se pueden registrar movimientos en un producto inactivo",
    "error.INSUFFICIENT_STOCK": "Stock insuficiente para «{producto}». Disponible: {disponible}, requerido: {requerido}",
    "error.INVALID_FILTER_VALUE": "El filtro «{campo}» no admite el valor «{valor}». Valores válidos: {validos}.",
    "error.INVALID_OR_EXPIRED_TOKEN": "Token inválido o expirado",
    "error.ORDER_ALREADY_SHIPPED": "La orden ya fue enviada",
    "error.PRODUCT_ALREADY_ACTIVE": "El producto ya está activo",
    "error.STOCK_CANNOT_BE_NEGATIVE": "El stock no puede quedar negativo",
    "error.ACCOUNT_DISABLED": "Tu cuenta ha sido desactivada. Contacta al administrador",
    "error.EMAIL_NOT_CONFIRMED": "Confirma tu correo antes de iniciar sesión",
    "error.INVALID_CREDENTIALS": "Credenciales inválidas",
    "error.NOT_AUTHENTICATED": "No autenticado",
    "error.SESSION_EXPIRED": "Sesión expirada, inicia sesión nuevamente",
    "error.WRONG_CURRENT_PASSWORD": "La contraseña actual es incorrecta",
    "error.BRAND_NOT_FOUND": "Marca no encontrada",
    "error.CATEGORY_NOT_FOUND": "Categoría no encontrada",
    "error.PRODUCT_NOT_FOUND": "Producto no encontrado",
    "error.PURCHASE_ORDER_NOT_FOUND": "Orden de compra no encontrada",
    "error.ROUTE_NOT_FOUND": "Ruta no encontrada: {metodo} {ruta}",
    "error.SALE_ORDER_NOT_FOUND": "Orden de venta no encontrada",
    "error.SUPPLIER_NOT_FOUND": "Proveedor no encontrado",
    "error.TAG_NOT_FOUND": "Etiqueta no encontrada",
    "error.USER_NOT_FOUND": "Usuario no encontrado",
    "error.BRAND_NAME_EXISTS": "Ya existe una marca con ese nombre",
    "error.CATEGORY_NAME_EXISTS": "Ya existe una categoría con ese nombre",
    "error.EMAIL_ALREADY_REGISTERED": "El correo ya está registrado",
    "error.EMAIL_IN_USE": "El correo ya está en uso por otra cuenta",
    "error.SUPPLIER_EMAIL_EXISTS": "Ya existe un proveedor con ese correo",
    "error.TAG_NAME_EXISTS": "Ya existe una etiqueta con ese nombre",
    "error.EXPORT_TOO_LARGE": "La exportación tiene {filas} filas y el máximo es {maximo}. Filtra antes de exportar.",
    "error.INVALID_IMAGE_FILE": "El archivo no es una imagen válida. Se admiten: {formatos}.",
    // Los dos 503 y el 500 dicen menos que el mensaje del servidor a propósito: los nombres
    // de las variables de entorno son para quien administra, no para quien usa la aplicación.
    // El detalle sigue viajando en el `message`, que es lo que se registra.
    "error.EMAIL_NOT_CONFIGURED": "El envío de correo no está configurado en el servidor.",
    "error.UPLOAD_NOT_CONFIGURED": "La subida de imágenes no está configurada en el servidor.",
    "error.INTERNAL_ERROR": "Error interno del servidor.",
    "error.RATE_LIMITED": "Demasiadas solicitudes. Espera un momento e intenta de nuevo.",
} as const;
