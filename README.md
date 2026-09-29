# Stockly — Frontend

[![verify](https://github.com/xfiberex/Stockly-F/actions/workflows/verify.yml/badge.svg)](https://github.com/xfiberex/Stockly-F/actions/workflows/verify.yml)

SPA para el sistema de gestión de inventario Stockly. El backend vive en un repositorio hermano,
`Stockly-B`, que se clona al lado de este.

Este README documenta **la SPA**. La documentación que cubre los dos repositorios vive en
`Stockly-B/docs/` —la carpeta que los contiene no está bajo control de versiones—, así que si no lo
tienes clonado, esos documentos no están en disco:

| Documento | Para qué |
|---|---|
| `Stockly-B/docs/CONTEXTO.md` | **Empieza aquí al retomar el proyecto.** Estado, decisiones vivas y trampas del entorno |
| `Stockly-B/docs/ROADMAP.md` | Las 129 tareas con progreso y métricas |
| [docs/design-system.md](docs/design-system.md) | **Lectura previa a tocar cualquier pantalla** |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Lo específico de este repositorio; la guía completa está en `Stockly-B` |

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript 6 |
| Bundler | Vite 8 |
| Estilos | TailwindCSS 4 |
| Enrutamiento | React Router v7 |
| Server state | TanStack React Query v5 |
| Formularios | React Hook Form 7 + Zod 4 |
| Cliente HTTP | Axios |
| Iconos | Heroicons (`@heroicons/react/24/outline`) |
| Gráficos | Recharts 3 |
| Fuente | Inter (fontsource, autohospedada) |
| Notificaciones | React Toastify |
| Tests | Vitest + Testing Library · Playwright (E2E) |
| Package manager | PNPM 12.4.1 *(fijado en `packageManager`; no usar npm ni yarn)* |

---

## Estructura

```
Stockly-F/
├── .github/workflows/verify.yml    # CI: `verify` y E2E en cada push a main y pull request
├── e2e/                            # Playwright: flujos que cruzan frontend y backend
└── src/                            # (detalle abajo)

Stockly-F/src/
├── main.tsx                        # Entry point: providers globales
├── App.tsx                         # Layout raíz con navbar + UserMenu + AdminMenu
├── routes/index.tsx                # Definición de rutas (React Router v7)
│
├── modules/
│   ├── auth/
│   │   ├── components/             # LoginPage, RegisterPage, ProfilePage,
│   │   │                           # ForgotPasswordPage, ResetPasswordPage,
│   │   │                           # VerifyEmailPage, ResendVerificationPage
│   │   ├── hooks/                  # useMe, useLogin, useLogout, useRegister,
│   │   │                           # useUpdateProfile, useUpdatePassword, ...
│   │   ├── api/                    # auth.api.ts
│   │   └── schemas/                # auth.schema.ts (Zod)
│   │
│   ├── dashboard/
│   │   └── components/DashboardPage.tsx   # KPI cards, alerta de stock bajo, gráfico
│   │
│   ├── catalog/
│   │   └── components/             # CatalogPage (layout pestañas),
│   │                               # CategoriesPage, BrandsPage
│   │
│   ├── products/
│   │   ├── components/             # ProductsPage, ProductTable, ProductForm (con tags),
│   │   │                           # ProductFilters (con filtro por tag), ProductImageUpload,
│   │   │                           # ProductDetailModal, StockMovementsPage,
│   │   │                           # ManualMovementModal, BulkStockModal
│   │   ├── hooks/                  # useProducts, useProduct, useCreateProduct,
│   │   │                           # useUpdateProduct, useDeleteProduct,
│   │   │                           # useRestoreProduct, useStockMovements, ...
│   │   ├── api/                    # product.api.ts
│   │   ├── schemas/                # product.schema.ts (Zod)
│   │   └── types/                  # product.types.ts
│   │
│   ├── tags/
│   │   ├── components/TagsPage.tsx # CRUD de etiquetas con selector de color
│   │   ├── hooks/useTags.ts
│   │   └── api/tags.api.ts
│   │
│   ├── suppliers/
│   │   └── components/SuppliersPage.tsx       # Incluye el plazo de entrega
│   │
│   ├── purchase-orders/
│   │   └── components/             # PurchaseOrdersPage (recepción parcial, exportar CSV),
│   │                               # SugerenciasReposicionPage
│   │
│   ├── sale-orders/
│   │   ├── components/SaleOrdersPage.tsx       # PENDING → SHIPPED / CANCELLED
│   │   ├── hooks/useSaleOrders.ts
│   │   └── api/sale-orders.api.ts
│   │
│   ├── users/
│   │   ├── components/UsersPage.tsx   # Panel ADMIN: rol, activar/desactivar
│   │   ├── hooks/useUsers.ts
│   │   └── api/users.api.ts
│   │
│   ├── settings/
│   │   ├── components/SettingsPage.tsx  # Toggle de opciones con guardado en lote
│   │   ├── hooks/useSettings.ts
│   │   └── api/settings.api.ts
│   │
│   ├── audit-logs/
│   │   ├── components/AuditLogsPage.tsx  # Tabla paginada con filtros
│   │   ├── hooks/useAuditLogs.ts
│   │   └── api/audit-logs.api.ts
│   │
│   └── reports/
│       └── components/             # ReportsPage (KPIs, margen, rotación, PDF),
│                                   # InformePorPeriodoPage (ventas y compras por periodo)
│
├── shared/
│   ├── components/                 # Badge, Button, DropdownButton, Input,
│   │                               # Modal, Select, Spinner, ProtectedRoute, NotFoundPage
│   └── hooks/                     # useDebounce
│
└── tests/                          # Tests unitarios por módulo
```

---

## Variables de entorno

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API REST. Relativa: Vite hace de proxy de `/api` hacia el backend, igual que nginx en el compose | `/api/v1` |

---

## Comandos

```bash
pnpm dev              # Dev server con HMR en localhost:5173
pnpm build            # Compilar TypeScript + generar dist/
pnpm preview          # Previsualizar el build de producción
pnpm lint             # Verificar ESLint — debe dar 0 errores y 0 avisos

pnpm test             # Tests en modo watch
pnpm test:run         # Tests sin watch (una sola pasada)
pnpm test:coverage    # Reporte de cobertura

pnpm verify           # Puerta de calidad: check → lint → test:coverage → build → auditoria
pnpm test:e2e:full    # Playwright en chromium y Mobile Chrome, sin levantar nada a mano
```

`pnpm verify` es la puerta de calidad: se pasa en local antes de cada push, y GitHub Actions la
repite, con el E2E, en cada push a `main` y en cada pull request
([ADR 0008](../Stockly-B/docs/adr/0008-integracion-continua.md)). Un aviso nuevo de `pnpm lint` es
una regresión, no ruido de fondo.

---

## Integración continua

Un workflow, [`.github/workflows/verify.yml`](.github/workflows/verify.yml), con **dos jobs** que
ejecutan lo mismo que en local. Corre en cada push a `main`, en cada pull request y a mano
(`workflow_dispatch`); un push nuevo cancela la ejecución en curso de la misma rama.

| Job | Qué hace | Tiempo máximo |
|---|---|---|
| **`verify`** | Clona este repositorio y **el `main` de `Stockly-B` al lado**, como en local, y ejecuta `pnpm install --frozen-lockfile` y `pnpm verify`. Con el backend al lado, la **frescura del contrato** (T4-01) se comprueba de verdad en vez de omitirse | 20 min |
| **`e2e`** | Los dos repositorios, un `postgres:17-alpine` de servicio, `prisma generate` en el backend, Chromium con sus dependencias y `pnpm test:e2e:full` en escritorio y móvil. Migraciones, seed y servidores los pone Playwright, igual que en local. **Si falla, sube `test-results` y `playwright-report` como artefacto** (7 días) | 25 min |

Las variables del E2E son de prueba y están en el propio workflow: las cuatro del backend y
`VITE_API_URL=/api/v1`, que en local sale del `.env` —sin ella la aplicación se queda en blanco,
que es como falló la primera ejecución—.

**Un cambio de contrato se sube primero al backend.** Este workflow clona el `main` de
`Stockly-B`; si el frontend llega antes, la frescura del contrato falla, y con razón: la copia no
coincide con la fuente publicada.

**Endurecido porque el repositorio es público:** `permissions: contents: read`,
`persist-credentials: false`, `pull_request` y nunca `pull_request_target` (el código de un fork
no corre con secretos; el workflow no usa ninguno) y **acciones fijadas por SHA** con la versión
en un comentario. No se actualizan solas: se resuelve la etiqueta nueva con
`gh api repos/<acción>/commits/<etiqueta> --jq .sha` y se cambian el SHA y el comentario.

`playwright.config.ts` solo mira `process.env.CI` para `forbidOnly` —un `.only` olvidado haría
pasar la CI ejecutando un test—. **Los reintentos siguen en 0**, también ahí: los fallos
intermitentes del E2E han sido siempre defectos reales.

---

## Rutas

| Ruta | Componente | Auth |
|---|---|---|
| `/auth/login` | `LoginPage` | — |
| `/auth/register` | `RegisterPage` | — |
| `/auth/forgot-password` | `ForgotPasswordPage` | — |
| `/auth/reset-password` | `ResetPasswordPage` | — |
| `/auth/confirm-account` | `VerifyEmailPage` | — |
| `/auth/resend-verification` | `ResendVerificationPage` | — |
| `/` | `DashboardPage` | JWT |
| `/profile` | `ProfilePage` | JWT |
| `/catalog/products` | `ProductsPage` | JWT |
| `/catalog/products/:id/movements` | `StockMovementsPage` | JWT |
| `/catalog/categories` | `CategoriesPage` | JWT |
| `/catalog/brands` | `BrandsPage` | JWT |
| `/catalog/suppliers` | `SuppliersPage` | JWT |
| `/catalog/tags` | `TagsPage` | JWT |
| `/purchase-orders` | `PurchaseOrdersPage` | JWT |
| `/purchase-orders/suggestions` | `SugerenciasReposicionPage` | JWT + ADMIN |
| `/sale-orders` | `SaleOrdersPage` | JWT |
| `/reports` | `ReportsPage` | JWT |
| `/reports/period` | `InformePorPeriodoPage` | JWT |
| `/admin/users` | `UsersPage` | JWT + ADMIN |
| `/settings` | `SettingsPage` | JWT + ADMIN |
| `/audit-logs` | `AuditLogsPage` | JWT + ADMIN |

Todas las rutas dentro de `/` están envueltas en `<ProtectedRoute>`. Las rutas admin muestran su enlace solo si el usuario es `ADMIN` mediante un menú desplegable en la barra de navegación.

---

## Módulos principales

### Dashboard

- 4 KPI cards: Total productos, Productos activos, Stock bajo, Categorías
- Valor total del inventario con enlace a reportes
- Gráfico de barras dual (stock + valor) por categoría
- Panel de alertas con productos en stock bajo/agotado

### Catálogo de productos

- Tabla paginada con filtros: búsqueda, categoría, **etiqueta**, estado
- Formulario de creación/edición con selector de **etiquetas** (multi-toggle con colores)
- Generador de SKU automático
- Importación masiva CSV/JSON; exportación CSV/JSON
- Movimiento manual de stock y ajuste masivo por selección múltiple
- Historial de movimientos con gráfico de evolución y exportación CSV
- Historial de precios con gráfico de área

### Etiquetas

- CRUD de etiquetas con selector de 10 colores predefinidos
- Las etiquetas aparecen en el formulario de producto y en el filtro de listado

### Órdenes de venta

- Listado de órdenes con estado (`PENDING`, `SHIPPED`, `CANCELLED`)
- Crear orden con datos del cliente e ítems (enlazados o manuales)
- Marcar como enviada (descuenta stock en backend), cancelar, eliminar
- Exportar CSV con todos los ítems

### Órdenes de compra

- Listado con estado (`PENDING`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`) y exportación CSV
- **Recibir mercancía**: cada entrega registra lo que llega de cada línea; la orden queda
  «Recibida a medias» hasta completarse, y cancelar retira lo que entró, no lo pedido
- **Sugerencias de reposición** (ADMIN): qué pedir según salidas, plazo del proveedor, mínimo,
  disponible y pendiente de recibir; se revisan y editan antes de generar una orden por proveedor

### Reportes

- KPIs, gráficos de valor/stock por categoría, movimientos por mes
- Top 10 por valor, alertas de bajo stock
- Valor del inventario a coste y **margen realizado** de los últimos 30 días
- **Tabla de métricas de rotación**: salidas 30d, velocidad diaria, días hasta desabastecimiento
- Botón **Descargar PDF** (genera reporte completo en servidor)
- **Ventas y compras por periodo**: atajos (este mes, mes anterior, este trimestre, este año) o
  un rango de fechas; totales, por mes con gráfico, por categoría y por producto; CSV y PDF. Los
  días son los de la **zona horaria del negocio** (Configuración), no los del navegador

### Gestión de usuarios (ADMIN)

- Tabla paginada con búsqueda y filtros por rol/estado
- Cambio de rol inline (ADMIN ↔ USER)
- Activar/desactivar cuenta (con protección self-action)

### Configuración (ADMIN)

- Toggles y campos para cada opción de la app, y el tema y el idioma de este dispositivo
- **Alertas de bajo stock por correo** (desactivado por defecto)
- **Plazo de entrega por defecto** para las sugerencias de reposición (7 días)
- **Zona horaria del negocio**, elegida de una lista (por defecto `America/Santo_Domingo`)
- Guardado en lote con un solo botón "Guardar cambios"

### Auditoría (ADMIN)

- Tabla paginada de registros con filtros por acción y entidad
- Muestra usuario, entidad afectada, fecha y detalles expandibles (JSON)

### Perfil

- Actualizar nombre y correo electrónico
- Cambiar contraseña (con confirmación)

---

## Sistema de diseño

**[docs/design-system.md](docs/design-system.md) — léelo antes de añadir una pantalla.**

Recoge los tokens de color con sus contrastes medidos, la escala tipográfica, la convención
de radios y elevación, el perfil de densidad con su excepción táctil, el semáforo de estado
y la regla que gobierna el resto: **el color comunica estado, nunca decora**.

No es una guía de estilo opcional. Cada sección dice qué test la vigila, y varias de esas
reglas ponen `pnpm verify` en rojo si se incumplen: una utilidad cruda de la paleta de
Tailwind, un radio fuera de los tres permitidos o una sombra que no sea uno de los dos
tokens de elevación fallan al ejecutar la suite, no en revisión.

---

## Componentes shared

| Componente | Descripción |
|---|---|
| `Badge` | Chip de estado con variantes `neutral`, `success`, `warning`, `danger`, `info` (T2-36 retiró las decorativas) y su icono |
| `Button` | Botón con variantes `primary`, `secondary`, `ghost`, `danger` y estado `isLoading` |
| `DropdownButton` | Botón con menú desplegable de acciones |
| `Input` | Campo de texto con label, error y forwarded ref |
| `Select` | Select nativo con label, error y forwarded ref |
| `Modal` | Overlay modal con portal, scroll y cierre con Escape |
| `Spinner` | Indicador de carga con tamaños `sm`, `md`, `lg` |
| `ProtectedRoute` | Wrapper que valida JWT y redirige al login |

---

## Tooling de IA versionado (`.agents/`, `.claude/`)

**Están en el repositorio a propósito.** No es un descuido ni un `.gitignore` que falta:
Stockly se trabaja desde varias máquinas y las skills tienen que viajar con el proyecto,
igual que el `README`. Quien clone Stockly-F se lleva el mismo tooling que quien lo escribió.

La contrapartida está medida: **294 archivos bajo `.agents/` y 164 bajo
`.claude/`, de 657 rastreados en total**. Eso ensucia dos cosas, y cada una tiene su
remedio:

| Ruido | Remedio |
|---|---|
| GitHub cuenta esos markdown como el lenguaje del proyecto | `.gitattributes` los marca `linguist-vendored` |
| Las búsquedas por texto devuelven sobre todo documentación | El alias `git buscar` de `.gitconfig-stockly` |

El alias hay que activarlo **una vez por clon**, porque vive en `.git/config`, que no se
versiona:

```bash
git config --local include.path ../.gitconfig-stockly
```

A partir de ahí:

```bash
git buscar useForm            # solo código de la aplicación
git buscar-archivos -i zod    # solo los archivos que coinciden
```

La diferencia es la que hace falta: `git grep -il z.object` devuelve **61** archivos y
`git buscar-archivos` devuelve **8**. Sin activarlo, el equivalente a mano es
`git grep X -- ':!.agents' ':!.claude'`.

## Credenciales seed

Las crea el seed del backend (`Stockly-B`, `pnpm db:seed`); la lista completa está en su
[README](../Stockly-B/README.md#seed).

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@stockly.app` | `Admin1234!` |
| USER | `laura@stockly.app` | `User1234!` |

> Las del E2E salen de ahí y son sobreescribibles por variables de entorno. **Nunca poner una
> contraseña real en `e2e/`**: ese directorio está versionado, y una fuga así ya obligó a reescribir
> el historial (T0-06).
