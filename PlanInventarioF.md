# Plan: Frontend — Inventario de Productos (CRUD Modular)

## Stack

| Paquete | Propósito |
|---|---|
| `react` + `react-dom` | UI framework (v19) |
| `vite` + `@vitejs/plugin-react-swc` | Build tool y dev server (v7) |
| `typescript` | Tipado estático (~5.9) |
| `tailwindcss` + `@tailwindcss/vite` | Estilos — CSS-first config v4 (sin tailwind.config.js) |
| `react-router-dom` | Enrutamiento (v7) |
| `@tanstack/react-query` + `@tanstack/react-query-devtools` | Server state: fetch, cache, invalidation, mutations (v5) |
| `axios` | HTTP client — instancia con baseURL e interceptors |
| `react-hook-form` + `@hookform/resolvers` | Manejo de formularios (v7) |
| `zod` | Esquemas de validación (v4) |
| `react-toastify` | Notificaciones de éxito/error |
| `@heroicons/react` | Iconos SVG |
| `@fontsource/inter` | Tipografía Inter |
| `clsx` + `tailwind-merge` | Utilidades para componer clases CSS |
| `recharts` | Gráfica de barras en el Dashboard |

Package manager: **PNPM**
Sin autenticación de usuarios (bcryptjs, jsonwebtoken no se usan).
Librerías de testing disponibles en devDependencies para fases posteriores.

---

## Arquitectura Feature-Based

```
Stockly-F/
├── public/
├── src/
│   ├── config/
│   │   └── env.ts                       # VITE_API_URL validado al arrancar
│   │
│   ├── lib/
│   │   ├── axios.ts                     # Instancia Axios con baseURL e interceptors
│   │   └── queryClient.ts               # QueryClient de TanStack Query (configuración global)
│   │
│   ├── shared/                          # Piezas reutilizables entre módulos
│   │   ├── components/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Table.tsx
│   │   ├── hooks/
│   │   │   └── useDebounce.ts           # Debounce para el campo de búsqueda
│   │   └── types/
│   │       └── index.ts                 # ApiResponse<T>, PaginationMeta, PaginatedResponse<T>
│   │
│   ├── modules/
│   │   └── products/                    # Módulo autónomo de productos
│   │       ├── api/
│   │       │   └── product.api.ts       # 6 llamadas Axios (getProducts, getProduct, create, update, delete, restore)
│   │       ├── components/
│   │       │   ├── ProductTable.tsx     # Tabla con acciones por fila
│   │       │   ├── ProductForm.tsx      # Formulario create/edit (RHF + Zod)
│   │       │   ├── ProductFilters.tsx   # Barra de búsqueda + select de categoría + select de estado
│   │       │   └── ProductImageUpload.tsx  # Preview local + campo file
│   │       ├── hooks/
│   │       │   ├── useProducts.ts       # useQuery — lista paginada con filtros
│   │       │   ├── useProduct.ts        # useQuery — un producto por ID
│   │       │   ├── useCreateProduct.ts  # useMutation — POST /products
│   │       │   ├── useUpdateProduct.ts  # useMutation — PUT /products/:id
│   │       │   ├── useDeleteProduct.ts  # useMutation — DELETE /products/:id
│   │       │   └── useRestoreProduct.ts # useMutation — PATCH /products/:id/restore
│   │       ├── schemas/
│   │       │   └── product.schema.ts    # Zod schemas createProductSchema / updateProductSchema
│   │       └── types/
│   │           └── product.types.ts     # Product, CreateProductDto, UpdateProductDto, ProductQuery
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx            # Stats cards + Recharts BarChart por categoría
│   │   ├── ProductsPage.tsx             # Tabla + paginación + filtros + modal form
│   │   └── NotFoundPage.tsx             # Ruta 404
│   │
│   ├── routes/
│   │   └── index.tsx                    # Rutas de React Router DOM
│   │
│   ├── App.tsx                          # Layout principal + RouterProvider
│   └── main.tsx                         # Entry point: QueryClientProvider + ToastContainer
│
├── index.html
├── vite.config.ts                       # Plugin React SWC + Tailwind v4 + alias @/
├── tsconfig.json
├── .env
├── .env.example
├── .gitignore
└── package.json
```

---

## Pasos y estado

### Sesión 1 — Pasos 1–3 ✅
- [x] Scaffold con Vite + React + TypeScript (React Compiler + babel)
- [x] Tailwind CSS v4 configurado vía `@tailwindcss/vite` (CSS-first, sin config.js)
- [x] Alias `@/`, Inter font, `.env.example`

### Sesión 2 — Pasos 4–6 ✅
- [x] `src/config/env.ts` — validación estricta de `VITE_API_URL`
- [x] `src/lib/axios.ts` — instancia con `baseURL` e interceptor de respuestas
- [x] `src/lib/queryClient.ts` — QueryClient con `staleTime` y `retry`
- [x] `src/shared/types/index.ts` — tipos `ApiResponse`, `PaginationMeta`, `PaginatedResponse`
- [x] `src/routes/index.tsx` + `App.tsx` + `main.tsx` con providers

### Sesión 3 — Pasos 7–9 ✅
- [x] `Button.tsx` — variantes: primary, secondary, danger, ghost
- [x] `Input.tsx` + `Select.tsx` — con label, error y ref forwarding
- [x] `Badge.tsx` — colores por categoría e isActive
- [x] `Modal.tsx` — portal con backdrop y tecla Escape
- [x] `Spinner.tsx` + `cn.ts` + `useDebounce.ts`

### Sesión 4 — Pasos 10–12 ✅
- [x] `product.types.ts` — Product, CreateProductDto, UpdateProductDto, ProductQuery
- [x] `product.api.ts` — getProducts, getProduct, createProduct, updateProduct, deleteProduct, restoreProduct
- [x] `product.schema.ts` — `createProductSchema` y `updateProductSchema` con Zod v4

### Sesión 5 — Pasos 13–15 ✅
- [x] `useProducts.ts` — `useQuery` con params de filtro y paginación
- [x] `useProduct.ts` — `useQuery` por ID
- [x] `useCreateProduct.ts` / `useUpdateProduct.ts` — `useMutation` + `invalidateQueries`
- [x] `useDeleteProduct.ts` / `useRestoreProduct.ts` — `useMutation` + `invalidateQueries`

### Sesión 6 — Pasos 16–18 ✅
- [x] `ProductFilters.tsx` — búsqueda con debounce + select categoría + toggle activos
- [x] `ProductTable.tsx` — columnas: imagen, nombre, categoría, precio, stock, estado, acciones
- [x] `ProductImageUpload.tsx` — preview local antes de subir
- [x] `ProductForm.tsx` — modal crear/editar con RHF + Zod + `multipart/form-data`
- [x] `ProductsPage.tsx` — composición de tabla + filtros + paginación + modal

### Sesión 7 — Pasos 19–21 ✅
- [x] `DashboardPage.tsx` — cards: total productos, activos, stock bajo, total categorías
- [x] Recharts `BarChart` — stock disponible por categoría
- [x] `NotFoundPage.tsx` — página 404 con link a inicio
- [x] Revisión final con backend corriendo — todos los flujos verificados
- [x] Bugs corregidos: parseo de `stock`/`price` en controller (create + update)
- [x] Bug corregido: `isActive` filter en backend soporta true/false/todos
- [x] Mejora: select de 3 estados en `ProductFilters` (activos/inactivos/todos)
- [x] Mejora: eliminar imagen de producto existente desde el formulario (removeImage + key pattern)

---

## Vistas implementadas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `DashboardPage` | Estadísticas generales + gráfica de inventario |
| `/products` | `ProductsPage` | CRUD completo: tabla, filtros, paginación, modal |
| `*` | `NotFoundPage` | Página 404 |

---

## Operaciones de API cubiertas

| Método | Endpoint Backend | Hook Frontend | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/products` | `useProducts` | Lista paginada con filtros y búsqueda |
| `GET` | `/api/v1/products/:id` | `useProduct` | Un producto por UUID |
| `POST` | `/api/v1/products` | `useCreateProduct` | Crear con imagen opcional |
| `PUT` | `/api/v1/products/:id` | `useUpdateProduct` | Editar datos e imagen |
| `DELETE` | `/api/v1/products/:id` | `useDeleteProduct` | Soft delete |
| `PATCH` | `/api/v1/products/:id/restore` | `useRestoreProduct` | Reactivar producto |

---

## Tipos principales

```typescript
// src/shared/types/index.ts
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// src/modules/products/types/product.types.ts
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  imagePublicId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
}
```

---

## Categorías válidas

Idénticas al backend — hardcoded en el frontend y en `product.schema.ts`:

```typescript
const VALID_CATEGORIES = [
  "Electrónica",
  "Periféricos",
  "Audio",
  "Accesorios",
  "Muebles",
  "Otros",
] as const;
```

---

## Variable de entorno

```bash
# .env.example
VITE_API_URL=http://localhost:3000/api/v1
```
