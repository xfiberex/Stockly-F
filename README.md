# Stockly — Frontend

[![verify](https://github.com/xfiberex/Stockly-F/actions/workflows/verify.yml/badge.svg)](https://github.com/xfiberex/Stockly-F/actions/workflows/verify.yml)

SPA del sistema de gestión de inventario Stockly. El backend vive en un repositorio hermano,
[`Stockly-B`](https://github.com/xfiberex/Stockly-B), que se clona al lado de este.

Este README es la **referencia de la SPA**. La documentación del proyecto —que cubre los dos
repositorios— vive en `Stockly-B/docs/`, porque la carpeta que los contiene no está bajo control de
versiones: si no lo tienes clonado, esos documentos no están en disco.

- **[README-proyecto](https://github.com/xfiberex/Stockly-B/blob/main/docs/README-proyecto.md)** — arranque desde cero y mapa de todos los documentos.
- **[CONTEXTO](https://github.com/xfiberex/Stockly-B/blob/main/docs/CONTEXTO.md)** — estado, trampas del entorno y decisiones vivas. Empieza aquí al retomar el proyecto.
- **[docs/design-system.md](docs/design-system.md)** — lectura previa a tocar cualquier pantalla.
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — lo específico de este repositorio.

---

## Stack

| Capa | Tecnología |
|---|---|
| Interfaz | React 19 + TypeScript 6, con React Compiler |
| Empaquetado | Vite 8 |
| Estilos | TailwindCSS 4, sobre tokens semánticos |
| Enrutamiento | React Router 7 |
| Estado del servidor | TanStack Query 5 |
| Formularios | React Hook Form 7 + Zod 4 |
| HTTP | Axios |
| Gráficos · iconos · fuente | Recharts 3 · Heroicons · Inter autohospedada |
| Escáner | `barcode-detector`, con ZXing en WebAssembly donde el navegador no trae lector |
| Tests | Vitest + Testing Library · Playwright (E2E) |
| Gestor de paquetes | pnpm 12.4.1 *(fijado en `packageManager`; no usar npm ni yarn)* |

---

## Estructura

```
Stockly-F/
├── .github/workflows/verify.yml   # CI: `verify` y E2E, con Stockly-B clonado al lado
├── docs/design-system.md          # Tokens, densidad, estados y los tests que los vigilan
├── e2e/                           # Playwright: flujos que cruzan frontend y backend
├── public/                        # favicon, robots.txt y AVISOS-DE-TERCEROS.txt
├── scripts/auditoria.js           # Vulnerabilidades, licencias y aviso de terceros
└── src/
    ├── main.tsx · App.tsx         # Proveedores; armazón con cabecera y navegación
    ├── routes/index.tsx           # Rutas, todas con `lazy()`
    ├── index.css                  # Tailwind y la capa de tokens (`@theme`)
    ├── modules/                   # Un directorio por sección
    │   └── <módulo>/              #   api/ · components/ · hooks/ · types/ · schemas/
    ├── shared/
    │   ├── api/                   # axios (CSRF, refresco de sesión, idioma) y descargas
    │   ├── components/            # Button, Input, Select, Modal, Badge, Paginacion, EscanerModal…
    │   ├── contratos/             # api.generated.ts: copia del contrato del backend. No se edita
    │   ├── hooks/                 # useT/useIdioma, useTema, useMenuDesplegable, useDebounce
    │   ├── i18n/                  # es.ts (catálogo de referencia), en.ts y el motor
    │   └── lib/                   # fechas, moneda, estados, títulos de ruta, clases compartidas
    └── tests/                     # Tests por módulo y guardias de todo `src/`
```

Módulos: `auth`, `dashboard`, `products`, `catalog` (categorías y marcas), `suppliers`, `tags`,
`purchase-orders`, `sale-orders`, `customers`, `inventory-counts`, `warehouses`, `stock-transfers`,
`reports`, `notifications`,
`users`, `settings` y `audit-logs`.

---

## Variables de entorno

```bash
cp .env.example .env
```

| Variable | Descripción | Valor |
|---|---|---|
| `VITE_API_URL` | Base de la API. **Relativa**: Vite hace de proxy de `/api` hacia el backend, igual que nginx en el compose, así que hay un solo origen y la aplicación se puede abrir desde el móvil o por un túnel | `/api/v1` |

---

## Comandos

```bash
pnpm dev                # Servidor de desarrollo en localhost:5173
pnpm build              # Tipos y build de producción en dist/
pnpm preview            # Sirve el build (sin proxy: no llega a la API)
pnpm check              # Tipos, sin emitir
pnpm lint               # ESLint: 0 errores y 0 avisos

pnpm test               # Vitest en modo observación
pnpm test:run           # Una sola pasada
pnpm test:coverage      # Con cobertura

pnpm verify             # Puerta de calidad: check → lint → test:coverage → build → auditoria
pnpm test:e2e:full      # Playwright en chromium y Mobile Chrome, sin levantar nada a mano
pnpm test:e2e:desktop   # Solo chromium
pnpm auditoria          # Dependencias; con --informe regenera el aviso de terceros
```

`pnpm verify` se pasa en local antes de cada push y la CI lo repite, con el E2E. El E2E
**resiembra la base de desarrollo del backend**. El detalle, en el
[CONTRIBUTING de `Stockly-B`](https://github.com/xfiberex/Stockly-B/blob/main/CONTRIBUTING.md).

---

## Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/auth/login` · `register` · `forgot-password` · `reset-password` · `confirm-account` · `resend-verification` | Acceso y recuperación de la cuenta | Sin sesión |
| `/` | Dashboard: indicadores, valor del inventario, stock bajo | Sesión |
| `/catalog/products` | Catálogo: tabla, filtros, alta y edición, escáner, etiquetas, importar y exportar | Sesión |
| `/catalog/products/:id/movements` | Histórico de movimientos, precios y costes de un producto | Sesión |
| `/catalog/categories` · `brands` · `suppliers` · `tags` | Tablas del catálogo | Sesión |
| `/purchase-orders` | Órdenes de compra y recepción de mercancía | Sesión |
| `/purchase-orders/suggestions` | Sugerencias de reposición | ADMIN |
| `/sale-orders` | Órdenes de venta | Sesión |
| `/customers` · `/customers/:id` | Clientes y su ficha | Sesión |
| `/inventory-counts` · `/inventory-counts/:id` | Conteos físicos | Sesión |
| `/stock-transfers` | Transferencias entre almacenes; registrarlas, `ADMIN` y `WAREHOUSE` | Sesión |
| `/warehouses` | Almacenes y lo que guarda cada uno; gestionarlos, `ADMIN` | Sesión |
| `/reports` · `/reports/period` | Informe general e informe por periodo | Sesión |
| `/profile` | Perfil, contraseña y «Acerca de Stockly» | Sesión |
| `/admin/users` · `/audit-logs` · `/settings` | Usuarios, auditoría y configuración | ADMIN |

**Navegación.** De 1024 px en adelante, una barra lateral con todos los destinos a un clic; por
debajo, un panel desplegable con la misma lista. La cabecera lleva la marca, la campana de avisos
y el menú de usuario. El grupo de administración solo se enseña a `ADMIN`.

---

## Qué hace cada sección

- **Catálogo.** Tabla paginada con filtros por texto, categoría, etiqueta, estado y clase ABC.
  Alta y edición con imagen, etiquetas, SKU generado y código de barras validado. **Escanear** con
  la cámara, una foto o una pistola USB: un código que existe abre su ficha y uno desconocido
  ofrece darlo de alta. **Etiquetas** en PDF, en hoja A4 o en rollo. Movimiento manual, ajuste de
  stock en bloque, importación CSV/JSON y exportación.
- **Compras.** Cada entrega registra lo que llega de cada línea y la orden queda «recibida a
  medias» hasta completarse; cancelar retira lo que entró, no lo pedido. Las **sugerencias de
  reposición** proponen qué pedir y generan una orden por proveedor.
- **Ventas y clientes.** Una venta no puede pedir más de lo disponible. Enviarla descuenta el
  stock; cancelar una enviada abre un diálogo que dice cuántas unidades vuelven. El cliente se
  elige con un buscador y tiene su ficha con historial.
- **Conteos físicos.** Se cuenta **a ciegas** —la captura no enseña el stock del sistema—, se
  revisan las diferencias en unidades y en valor, y cerrar las convierte en ajustes. Las dos
  tablas caben a 393 px: se usan con el móvil en la mano.
- **Almacenes.** Con más de uno, cada formulario que mueve stock pregunta en cuál, y el disponible
  que valida una venta o una transferencia es el de ese almacén. **Con uno solo, nada de esto se
  pinta**: ni selectores ni desgloses. El mostrador recuerda su local en el dispositivo.
- **Informes.** Indicadores, valor a coste y a precio de venta, margen realizado, rotación y
  clasificación ABC, con PDF. **Ventas y compras por periodo**, con atajos o rango de fechas, en
  la zona horaria del negocio, con CSV y PDF.
- **Avisos.** Una campana con los avisos de cada usuario —stock bajo, venta que no se pudo enviar,
  compra fuera de plazo—, que se consulta cada minuto y al volver a la pestaña.
- **Configuración.** Los ajustes del negocio (ADMIN) y, por dispositivo, el tema —claro, oscuro o
  automático— y el idioma —español, inglés o el del navegador—.

---

## Cómo está hecho

Cinco reglas sostienen la aplicación, y casi todas tienen un test que pone `pnpm verify` en rojo
si se incumplen. El porqué de cada una está en
[CONTEXTO §6](https://github.com/xfiberex/Stockly-B/blob/main/docs/CONTEXTO.md).

| Regla | Dónde | Lo vigila |
|---|---|---|
| Los tipos de las respuestas no se escriben aquí: son una copia del contrato del backend | `shared/contratos/` | `frescura.test.ts` |
| Ningún texto se escribe en un componente: sale del catálogo, en español y en inglés | `shared/i18n/` | `literales.test.ts`, `catalogo.test.ts` |
| Un botón que llama a la API se enseña con `usePuede()`, no con `role === "ADMIN"` | `modules/auth/hooks/usePuede.ts` | la matriz `PERMISOS` del contrato |
| El color comunica estado, nunca decora: tokens semánticos, sin utilidades crudas de la paleta | `index.css`, [design-system.md](docs/design-system.md) | `theme.test.ts`, `tokens.test.ts` |
| Un listado paginado no se filtra en el navegador: los filtros viajan al servidor | cada `hooks/` | — |

---

## Credenciales del seed

Las crea el seed del backend (`pnpm db:seed` en `Stockly-B`).

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@stockly.app` | `Admin1234!` |
| USER | `laura@stockly.app` | `User1234!` |
| WAREHOUSE | `almacen@stockly.app` | `Almacen1234!` |
| SELLER | `vendedor@stockly.app` | `Vendedor1234!` |

> Las del E2E salen de ahí y son sobreescribibles por variables de entorno. **Nunca poner una
> contraseña real en `e2e/`**: ese directorio está versionado.

---

## Licencia

Copyright © 2026 Ricky Angel Jiménez Bueno.

Stockly es software libre: puedes redistribuirlo y modificarlo bajo los términos de la
**[GNU Affero General Public License v3](LICENSE)** (`AGPL-3.0-only`). Quien ofrezca una versión
modificada a otros usuarios **por la red** tiene que ofrecerles también su código: la aplicación
lo enlaza desde **Perfil → Acerca de Stockly** (`src/shared/lib/codigoFuente.ts`, que hay que
apuntar al propio repositorio al desplegar una versión modificada). El porqué de la elección está
en el [ADR 0009](https://github.com/xfiberex/Stockly-B/blob/main/docs/adr/0009-licencia-agpl.md).
Las versiones publicadas antes del 2026-09-30 se distribuyeron con la MIT.
