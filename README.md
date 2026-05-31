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
├── App.tsx                         # Layout raíz con navbar + UserMenu
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
│   │   ├── components/             # ProductsPage, ProductTable, ProductForm,
│   │   │                           # ProductFilters, ProductImageUpload,
│   │   │                           # ProductDetailModal, StockMovementsPage,
│   │   │                           # ManualMovementModal, BulkStockModal
│   │   ├── hooks/                  # useProducts, useProduct, useCreateProduct,
│   │   │                           # useUpdateProduct, useDeleteProduct,
│   │   │                           # useRestoreProduct, useStockMovements, ...
│   │   ├── api/                    # product.api.ts
│   │   ├── schemas/                # product.schema.ts (Zod)
│   │   └── types/                  # product.types.ts
│   │
│   ├── suppliers/
│   │   └── components/SuppliersPage.tsx
│   │
│   ├── purchase-orders/
│   │   └── components/PurchaseOrdersPage.tsx
│   │
│   └── reports/
│       └── components/ReportsPage.tsx      # KPIs, gráficos, tablas
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
pnpm test:run         # Tests sin watch (CI)
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
| `/purchase-orders` | `PurchaseOrdersPage` | JWT |
| `/reports` | `ReportsPage` | JWT |

Todas las rutas dentro de `/` están envueltas en `<ProtectedRoute>` que redirige a `/auth/login` si no hay sesión activa.

---

## Módulos principales

### Dashboard

- 4 KPI cards clickeables: Total productos, Productos activos, Stock bajo (alerta naranja), Categorías
- Valor total del inventario con enlace a reportes
- Gráfico de barras dual (stock + valor) por categoría
- Panel de alertas con los productos en stock bajo/agotado

### Catálogo de productos

- Tabla paginada con filtros (búsqueda, categoría, estado, marca)
- Acciones por fila: ver detalles (modal), historial de movimientos, editar, eliminar / restaurar
- Modal de detalle con todos los campos, imagen y badge de stock
- Formulario de creación/edición con previsualización de imagen y generador de SKU
- Importación masiva por CSV
- Movimiento manual de stock (modal)
- Ajuste masivo de stock por selección múltiple

### Reportes

- KPIs: total productos, activos, bajo stock, valor del inventario
- Gráfico de barras horizontal: valor por categoría
- Gráfico de pastel: distribución de stock
- Gráfico de barras agrupado: movimientos por mes (entradas / salidas / ajustes)
- Top 10 productos por valor de stock
- Tabla de productos con stock bajo o agotado

### Órdenes de compra

- Listado de órdenes con estado (`PENDING`, `RECEIVED`, `CANCELLED`)
- Crear orden con proveedor e ítems
- Marcar como recibida (actualiza stock automáticamente en el backend)
- Cancelar y eliminar órdenes

### Perfil

- Actualizar nombre y correo electrónico
- Cambiar contraseña (con confirmación)

---

## Componentes shared

| Componente | Descripción |
|---|---|
| `Badge` | Chip de estado con variantes `success`, `danger`, `orange`, `blue`, `gray` |
| `Button` | Botón con variantes `primary`, `ghost`, `danger` y estado `isLoading` |
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
