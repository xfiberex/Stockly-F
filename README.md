# Stockly — Frontend

SPA para el sistema de gestión de inventario Stockly.

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
| Tests | Vitest + Testing Library |
| Package manager | PNPM 11+ |

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
pnpm lint             # Verificar ESLint

pnpm test             # Tests en modo watch
pnpm test:run         # Tests sin watch (una sola pasada)
pnpm test:coverage    # Reporte de cobertura
```

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

## Componentes shared

| Componente | Descripción |
|---|---|
| `Badge` | Chip de estado con variantes `success`, `danger`, `orange`, `blue`, `purple`, `teal`, `gray` |
| `Button` | Botón con variantes `primary`, `secondary`, `ghost`, `danger` y estado `isLoading` |
| `DropdownButton` | Botón con menú desplegable de acciones |
| `Input` | Campo de texto con label, error y forwarded ref |
| `Select` | Select nativo con label, error y forwarded ref |
| `Modal` | Overlay modal con portal, scroll y cierre con Escape |
| `Spinner` | Indicador de carga con tamaños `sm`, `md`, `lg` |
| `ProtectedRoute` | Wrapper que valida JWT y redirige al login |

---

## Credenciales seed

| Rol | Email | Contraseña |
|---|---|---|
| ADMIN | `admin@stockly.app` | `Admin1234!` |
| USER | `laura@stockly.app` | `User1234!` |
