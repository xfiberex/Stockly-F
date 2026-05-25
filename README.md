# 🖥️ Stockly — Frontend de Inventario de Productos

> SPA React para gestión visual de inventario con soporte completo de CRUD, filtros, paginación y subida de imágenes.

---

## 🗂️ Tabla de Contenidos

- [📋 Descripción](#-descripción)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [⚙️ Variables de Entorno](#️-variables-de-entorno)
- [🚀 Instalación y Ejecución](#-instalación-y-ejecución)
- [🧭 Rutas de la Aplicación](#-rutas-de-la-aplicación)
- [🧩 Módulo de Productos](#-módulo-de-productos)
- [🏗️ Arquitectura](#️-arquitectura)

---

## 📋 Descripción

**Stockly Frontend** es una SPA construida con **React 19** y **TypeScript 6** que consume la API REST de Stockly Backend. Permite gestionar el inventario de productos con operaciones de creación, edición, eliminación (soft delete) y restauración. Incluye búsqueda en tiempo real con debounce, filtrado por categoría y estado, paginación del lado del servidor, y previsualización de imágenes antes de subir.

---

## 🛠️ Stack Tecnológico

### ⚛️ Core

| Paquete | Versión | Propósito |
|---|---|---|
| `react` + `react-dom` | ^19.2.6 | UI y renderizado |
| `typescript` | ~6.0.2 | Tipado estático |
| `vite` | ^8.0.12 | Bundler y dev server |
| `react-router-dom` | ^7.15.1 | Enrutamiento cliente |

### 🔄 Estado y Data Fetching

| Paquete | Versión | Propósito |
|---|---|---|
| `@tanstack/react-query` | ^5.100.14 | Server state, caché y mutaciones |
| `@tanstack/react-query-devtools` | ^5.100.14 | Devtools de React Query |
| `axios` | ^1.16.1 | Cliente HTTP |

### 📝 Formularios y Validación

| Paquete | Versión | Propósito |
|---|---|---|
| `react-hook-form` | ^7.76.1 | Gestión de formularios con control de estado |
| `@hookform/resolvers` | ^5.4.0 | Integración de Zod con react-hook-form |
| `zod` | ^4.4.3 | Validación y parsing de esquemas |

### 🎨 Estilos y UI

| Paquete | Versión | Propósito |
|---|---|---|
| `tailwindcss` | ^4.3.0 | Estilos utility-first |
| `@tailwindcss/vite` | ^4.3.0 | Plugin de Tailwind para Vite |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.6.0 | Composición condicional de clases |
| `@heroicons/react` | ^2.2.0 | Iconos SVG |
| `@fontsource/inter` | ^5.2.8 | Fuente Inter autohospedada |
| `react-toastify` | ^11.1.0 | Notificaciones toast |
| `recharts` | ^3.8.1 | Gráficos para el dashboard |

### 🧪 Testing

| Paquete | Versión | Propósito |
|---|---|---|
| `vitest` | ^4.1.7 | Test runner |
| `@testing-library/react` | ^16.3.2 | Utilidades de testing para React |
| `@testing-library/user-event` | ^14.6.1 | Simulación de eventos de usuario |
| `@testing-library/jest-dom` | ^6.9.1 | Matchers adicionales para el DOM |
| `jsdom` | ^29.1.1 | Entorno DOM para tests |
| `@vitest/coverage-v8` | ^4.1.7 | Cobertura de código |

> **Package manager:** PNPM · **React Compiler:** activado con `babel-plugin-react-compiler`

---

## 📁 Estructura del Proyecto

```
Stockly-F/
├── 📄 index.html                      # Entry point HTML
├── 📄 vite.config.ts                  # Configuración de Vite + React Compiler
├── 📄 tsconfig.json                   # Referencias de TypeScript
├── 📄 .env.example                    # Plantilla de variables requeridas
├── 📂 public/                         # Assets estáticos
└── 📂 src/
    ├── 📄 main.tsx                    # Entry point: providers globales
    ├── 📄 App.tsx                     # Árbol de rutas raíz
    ├── 📄 index.css                   # Estilos globales + fuente Inter
    │
    ├── 📂 config/
    │   └── env.ts                     # Validación de variables de entorno al arrancar
    │
    ├── 📂 lib/
    │   ├── axios.ts                   # Instancia de Axios con baseURL de la API
    │   ├── cn.ts                      # Helper clsx + twMerge
    │   └── queryClient.ts             # Instancia global de QueryClient
    │
    ├── 📂 routes/
    │   └── index.tsx                  # Definición de rutas con react-router-dom v7
    │
    ├── 📂 pages/
    │   ├── DashboardPage.tsx          # Vista del dashboard con gráficos
    │   ├── ProductsPage.tsx           # Vista de la tabla de productos
    │   └── NotFoundPage.tsx           # Página 404
    │
    ├── 📂 modules/
    │   └── 📂 products/               # Módulo autónomo de productos
    │       ├── 📂 api/
    │       │   └── product.api.ts     # Todas las llamadas HTTP al backend
    │       ├── 📂 components/
    │       │   ├── ProductsPage.tsx   # Orquestador del módulo (filtros + tabla)
    │       │   ├── ProductTable.tsx   # Tabla con acciones por fila
    │       │   ├── ProductFilters.tsx # Barra de búsqueda, categoría y estado
    │       │   ├── ProductForm.tsx    # Formulario de creación/edición
    │       │   └── ProductImageUpload.tsx # Input de imagen con previsualización
    │       ├── 📂 hooks/
    │       │   ├── useProducts.ts     # Query paginada con filtros
    │       │   ├── useProduct.ts      # Query de un solo producto
    │       │   ├── useCreateProduct.ts
    │       │   ├── useUpdateProduct.ts
    │       │   ├── useDeleteProduct.ts
    │       │   └── useRestoreProduct.ts
    │       ├── 📂 schemas/
    │       │   └── product.schema.ts  # Esquema Zod del formulario
    │       └── 📂 types/
    │           └── product.types.ts   # Interfaces TypeScript del módulo
    │
    └── 📂 shared/
        ├── 📂 components/             # Componentes UI reutilizables
        │   ├── Badge.tsx
        │   ├── Button.tsx
        │   ├── Input.tsx
        │   ├── Modal.tsx
        │   ├── Select.tsx
        │   └── Spinner.tsx
        ├── 📂 hooks/
        │   └── useDebounce.ts         # Debounce genérico para búsqueda
        └── 📂 types/
            └── index.ts               # ApiResponse, PaginationMeta y tipos comunes
```

---

## ⚙️ Variables de Entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base de la API REST del backend | `http://localhost:3000/api/v1` |

> ⚠️ La app **no arranca** si `VITE_API_URL` está ausente. El módulo `src/config/env.ts` lanza un error explícito al inicio indicando cuál variable falta.

---

## 🚀 Instalación y Ejecución

### 1️⃣ Clonar e instalar dependencias

```bash
git clone <repo-url>
cd Stockly-F
pnpm install
```

### 2️⃣ Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con la URL del backend
```

### 3️⃣ Levantar el servidor de desarrollo

```bash
pnpm dev
```

La app estará disponible en `http://localhost:5173`

> Asegúrate de que el backend (`Stockly-B`) esté corriendo en `http://localhost:3000` antes de iniciar el frontend.

### 📋 Scripts disponibles

| Script | Comando | Descripción |
|---|---|---|
| `pnpm dev` | `vite` | Dev server con HMR en `localhost:5173` |
| `pnpm build` | `tsc -b && vite build` | Compilar TypeScript y generar `dist/` |
| `pnpm preview` | `vite preview` | Previsualizar el build de producción |
| `pnpm lint` | `eslint .` | Verificar reglas de ESLint |

---

## 🧭 Rutas de la Aplicación

| Ruta | Página | Descripción |
|---|---|---|
| `/` | `DashboardPage` | Dashboard con métricas y gráficos del inventario |
| `/products` | `ProductsPage` | Tabla de productos con CRUD completo |
| `*` | `NotFoundPage` | Página 404 para rutas no encontradas |

---

## 🧩 Módulo de Productos

### Funcionalidades

- **Listar** productos con paginación del lado del servidor
- **Buscar** por nombre o descripción (debounce de 400 ms)
- **Filtrar** por categoría y por estado activo/inactivo
- **Crear** producto con imagen opcional (previsualización antes de subir)
- **Editar** datos e imagen de un producto existente
- **Eliminar** con soft delete (el producto pasa a inactivo)
- **Restaurar** un producto previamente desactivado

### Categorías válidas

| Categoría | Descripción |
|---|---|
| `Electrónica` | Laptops, monitores, computadoras |
| `Periféricos` | Teclados, mouse, webcams |
| `Audio` | Auriculares, altavoces, micrófonos |
| `Accesorios` | Cables, hubs, soportes y complementos |
| `Muebles` | Sillas, escritorios, estantes |
| `Otros` | Productos sin categoría específica |

### Capas del módulo

| Capa | Archivo(s) | Responsabilidad |
|---|---|---|
| **API** | `product.api.ts` | Peticiones HTTP — toda la lógica de red en un solo lugar |
| **Hooks** | `use*.ts` | Queries y mutaciones de React Query |
| **Schema** | `product.schema.ts` | Validación Zod del formulario de creación/edición |
| **Types** | `product.types.ts` | Interfaces TypeScript del módulo |
| **Components** | `Product*.tsx` | Componentes de presentación y orquestación |

---

## 🏗️ Arquitectura

El frontend sigue una **arquitectura modular por feature**. Los componentes compartidos viven en `shared/`; cada módulo es autónomo y gestiona su propio estado de servidor.

```
Usuario
   │
   ▼
main.tsx (QueryClientProvider + BrowserRouter + ToastContainer)
   │
   ▼
App.tsx → routes/index.tsx
   │
   ├── /               → DashboardPage
   │
   └── /products       → ProductsPage (pages)
                              │
                        ProductsPage (módulo) — orquestador
                              │
                 ┌────────────┼────────────┐
                 │            │            │
          ProductFilters  ProductTable  ProductForm
                 │            │            │
                 └────────────┴────────────┘
                              │
                    hooks / React Query
                              │
                         product.api.ts
                              │
                         Axios instance
                              │
                       Stockly Backend API
```

### Gestión de estado

| Tipo de estado | Solución |
|---|---|
| Estado del servidor (productos, paginación) | React Query (`useQuery` / `useMutation`) |
| Estado de formularios | react-hook-form + Zod |
| Estado de UI local (modal abierto, filtros) | `useState` de React |

### Singleton de QueryClient

El cliente de React Query se instancia una sola vez en `src/lib/queryClient.ts` y se monta en el proveedor raíz de `main.tsx`, evitando múltiples instancias en el árbol de componentes.

### Helper `cn`

```typescript
// src/lib/cn.ts
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

Permite componer clases de Tailwind de forma condicional sin conflictos de especificidad.

---

<div align="center">

**Stockly Frontend** — React 19 · TypeScript 6 · Vite 8 · TanStack Query · Tailwind CSS 4

</div>
