# Stockly — Frontend

SPA para el sistema de gestión de inventario Stockly. El backend vive en un repositorio hermano,
`Stockly-B`, que se clona al lado de este.

Este README documenta **la SPA**. La documentación que cubre los dos repositorios vive en
`Stockly-B/docs/` —la carpeta que los contiene no está bajo control de versiones—, así que si no lo
tienes clonado, esos documentos no están en disco:

| Documento | Para qué |
|---|---|
| `Stockly-B/docs/CONTEXTO.md` | **Empieza aquí al retomar el proyecto.** Estado, decisiones vivas y trampas del entorno |
| `Stockly-B/docs/ROADMAP.md` | Las 107 tareas con progreso y métricas |
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
| Package manager | PNPM 11.21.0 *(fijado en `packageManager`; no usar npm ni yarn)* |

---

## Estructura

```
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
│   │   └── components/SuppliersPage.tsx
│   │
│   ├── purchase-orders/
│   │   └── components/PurchaseOrdersPage.tsx   # Incluye exportar CSV
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
│       └── components/ReportsPage.tsx   # KPIs, gráficos, métricas de rotación, descargar PDF
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
| `VITE_API_URL` | URL base de la API REST | `http://localhost:3000/api` |

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

pnpm verify           # Puerta de calidad: check → lint → test:coverage → build
pnpm test:e2e:full    # Playwright en chromium y Mobile Chrome, sin levantar nada a mano
```

**Este proyecto no usa CI**, y es deliberado
([ADR 0005](../Stockly-B/docs/adr/0005-sin-integracion-continua.md)): `pnpm verify` es la única
puerta de calidad, y hay que pasarla en local antes de cada push. Un aviso nuevo de `pnpm lint` es
una regresión, no ruido de fondo.

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
| `/sale-orders` | `SaleOrdersPage` | JWT |
| `/reports` | `ReportsPage` | JWT |
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

- Igual que antes + botón **Exportar CSV**

### Reportes

- KPIs, gráficos de valor/stock por categoría, movimientos por mes
- Top 10 por valor, alertas de bajo stock
- **Tabla de métricas de rotación**: salidas 30d, velocidad diaria, días hasta desabastecimiento
- Botón **Descargar PDF** (genera reporte completo en servidor)

### Gestión de usuarios (ADMIN)

- Tabla paginada con búsqueda y filtros por rol/estado
- Cambio de rol inline (ADMIN ↔ USER)
- Activar/desactivar cuenta (con protección self-action)

### Configuración (ADMIN)

- Toggles y campos para cada opción de la app
- Primer ítem: **Alertas de bajo stock por correo** (desactivado por defecto)
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
