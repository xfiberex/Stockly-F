# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal de un comercio cualquiera que maneja inventario. No apunta a un rubro concreto. Cuatro roles con trabajos distintos:

- **ADMIN**: configura el negocio (datos, moneda, impuestos), gestiona usuarios y aprueba las cuentas que llegan por el registro público, revisa informes y la bitácora de auditoría. Trabaja sobre todo en escritorio.
- **USER**: operación general: productos, catálogo, proveedores, clientes, órdenes de compra y de venta.
- **WAREHOUSE**: entradas de stock, lotes y caducidades, conteos de inventario, transferencias entre almacenes. Suele estar de pie en el almacén, con el móvil y el escáner de la cámara.
- **SELLER**: atiende el mostrador. Vende en un paso, a menudo con prisa y con el cliente delante, en un PC o una tableta.

Las cuentas creadas por registro público quedan sin rol hasta que un ADMIN las aprueba.

## Product Purpose

Controlar el inventario de un comercio de punta a punta: qué hay, dónde está (varios almacenes), qué entra por compras a proveedores y qué sale por ventas, con lotes y salida por orden de caducidad. Éxito: el stock que muestra Stockly coincide con el físico, y cada rol hace su tarea sin fricción en el dispositivo que tiene a mano.

Tiene un doble propósito: es una pieza de portafolio que debe verse profesional ante quien la evalúe, y está pensada para usarse después en un negocio real. Ninguno de los dos justifica sacrificar al otro: el pulido no puede costar velocidad de operación.

## Positioning

Sin decidir. Hechos que la sostienen y que un producto vecino no puede copiar sin más: código abierto con licencia AGPL-3.0, autohospedable con Docker, bilingüe (español e inglés) y con escáner de código de barras en el navegador, sin hardware dedicado. Como referencia de alcance se comparó con SistemaVenta para el mostrador y el documento de venta.

## Operating Context

- **Oficina, escritorio:** administración, compras, informes, configuración y usuarios.
- **Almacén, móvil:** conteos, entradas, lotes y transferencias, con la cámara como lector de códigos de barras.
- **Mostrador, PC o tableta:** venta rápida y comprobante de venta en PDF.
- Notificaciones en la aplicación (campana) y resumen semanal por correo electrónico.
- Se despliega como SPA tras nginx con un solo origen; también se abre desde el móvil o por un túnel.

## Capabilities and Constraints

- Módulos: autenticación, panel, productos, catálogo (categorías y marcas), etiquetas, proveedores, clientes, órdenes de compra, órdenes de venta y mostrador, conteos de inventario, almacenes, transferencias, lotes y caducidades, informes, notificaciones, usuarios, configuración y bitácora de auditoría.
- Las ventas tienen número correlativo, impuesto, moneda configurable y estados con transiciones fijas.
- Interfaz en español (catálogo de referencia) e inglés, con tema claro y oscuro.
- Stack: React 19, TypeScript, Vite, Tailwind CSS 4 con tokens semánticos, TanStack Query, React Hook Form + Zod, Recharts, Heroicons, Inter autohospedada.
- El sistema de diseño vigente está documentado en `docs/design-system.md` y vigilado por tests. Cualquier cambio visual lo respeta o lo actualiza.
- Terminología del dominio en español: almacén, lote, caducidad, conteo, transferencia, mostrador, comprobante.

## Brand Commitments

- Nombre: Stockly.
- Licencia AGPL-3.0, con enlace al código fuente en la aplicación.
- Voz: español claro y directo en la interfaz, sin jerga técnica hacia el usuario.

## Evidence on Hand

- Datos de demostración del seed del backend (productos, dos almacenes, cuentas por rol). Son datos ficticios.
- No hay clientes reales, testimonios, cifras de uso ni precios. No inventarlos.

## Product Principles

1. **Operar primero.** Cada pantalla se juzga por lo rápido y seguro que un rol completa su tarea; la estética está al servicio de eso.
2. **El dispositivo manda.** Lo del almacén funciona de pie y con una mano en el móvil; lo del mostrador, con prisa; lo de la oficina puede ser denso.
3. **El número es la verdad.** Stock, importes y estados se muestran exactos y sin ambigüedad; ante un error o un rechazo, la pantalla lo dice y se recupera.
4. **Profesional sin adornos.** Debe verse como una herramienta seria y cuidada, apta para un portafolio, sin decoración que estorbe al trabajo.

## Accessibility & Inclusion

Comprobado: navegación completa con teclado y árbol de accesibilidad correcto (ver `Stockly-B/docs/accesibilidad.md`). No comprobado: el recorrido con lector de pantalla. Objetivo de mínimo táctil en móvil, según `docs/design-system.md`.
