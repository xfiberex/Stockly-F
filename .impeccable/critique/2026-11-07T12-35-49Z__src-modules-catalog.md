---
target: catálogo (media de 6; productos 25)
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\catalog"
timestamp: 2026-11-07T12-35-49Z
slug: src-modules-catalog
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica del proyecto pantalla por pantalla, 2026-11-06/07

## Catálogo — notas por pantalla

| Pantalla | Nota | Banda |
|---|---|---|
| Productos (`products/components/ProductsPage.tsx`) | 25/40 | Aceptable |
| Movimientos (`products/components/StockMovementsPage.tsx`) | 27/40 | Aceptable |
| Categorías (`catalog/components/CategoriesPage.tsx`) | 25/40 | Aceptable |
| Marcas (`catalog/components/BrandsPage.tsx`) | 25/40 | Aceptable |
| Proveedores (`suppliers/components/SuppliersPage.tsx`) | 26/40 | Aceptable |
| Etiquetas (`tags/components/TagsPage.tsx`) | 24/40 | Aceptable |

Detector: CLI limpia; navegador, solo los dos falsos positivos del proyecto. Chrome: el buscador de Productos no tiene `id`, `name` ni etiqueta accesible (`ProductFilters.tsx:98-104`).

## Problemas prioritarios
1. [P1] Productos a 390: la tabla mide 1099 px en 357 y sin barra visible; el stock queda ~740 px a la derecha. Tarjetas por debajo de `md`, filtros plegados. adapt.
2. [P1] Eliminar sin confirmar en todo el bloque (Productos borra además la imagen de Cloudinary sin poder restaurarla; Categorías, Marcas, Proveedores, Etiquetas). harden.
3. [P1] Categorías y Marcas cierran el modal antes de que responda la API: si falla, se pierde lo escrito (`CatalogItemSection.tsx:131-138`). harden.
4. [P1] Etiquetas: «Nueva», «Editar» y «Eliminar» visibles para roles que la API rechaza con 403. `usePuede("POST /tags")`. harden.
5. [P2] La ficha que abre el escáner no deja registrar el movimiento ni escanear otro. clarify.
6. [P2] Formulario de edición confuso con el stock; pestañas de Movimientos sin semántica de pestañas; `aria-label` sin el nombre de la fila en Categorías/Marcas/Proveedores; spinner de borrado en todas las filas; filtros fuera de la URL.

## Persona red flags
- Alex: sin ordenar columnas; filtros perdidos al volver de Movimientos; 4–5 pasos tras escanear.
- Sam: «Editar»/«Eliminar» sin nombre de fila; pestañas sin rol.
- WAREHOUSE: stock oculto en móvil; botones de Etiquetas que acaban en 403.
- ADMIN: borrados irreversibles; no ve cuántos productos afecta un borrado.
