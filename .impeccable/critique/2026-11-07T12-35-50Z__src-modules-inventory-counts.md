---
target: inventario (media de 5; un conteo, 24)
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\inventory-counts"
timestamp: 2026-11-07T12-35-50Z
slug: src-modules-inventory-counts
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica del proyecto pantalla por pantalla, 2026-11-06/07

## Inventario — notas por pantalla

| Pantalla | Nota | Banda |
|---|---|---|
| Conteos físicos (`inventory-counts/components/InventoryCountsPage.tsx`) | 28/40 | Buena |
| Un conteo (`InventoryCountPage.tsx`) | 24/40 | Aceptable |
| Transferencias (`stock-transfers/components/TransfersPage.tsx`) | 29/40 | Buena |
| Caducidades (`reports/components/CaducidadesPage.tsx`) | 30/40 | Buena |
| Almacenes (`warehouses/components/WarehousesPage.tsx`) | 27/40 | Aceptable |

Detector: CLI limpia; navegador, solo `straggler` ×9 en `/expiry` a 390 (el SKU solo en la segunda línea, `CaducidadesPage.tsx:143-146`).

## Problemas prioritarios
1. [P1] Un conteo: las cifras escritas sin guardar se pierden sin aviso al pasar a «Revisar», escanear, paginar o salir (verificado; `cifras` es estado local de `Captura`). harden.
2. [P1] Un conteo a 390: el primer campo cae en el pliegue; «Guardar» arriba, lejos del pulgar. Resumen plegado y barra fija abajo. adapt.
3. [P1] Almacenes: «Desactivar» y «Hacer predeterminado» de un clic, sin confirmar; «Desactivar» activo con stock (falla en el servidor). harden.
4. [P2] Vacíos que ignoran los filtros («Todavía no hay conteos» con `?estado=CLOSED`); abrir conteo sobre una categoría ya abierta solo falla al enviar; «Quedan X» de transferencias es histórico y se lee como actual; sin escáner en el formulario de transferencia; `aria-label` del desplegable de transferencias que tapa su contenido; jerarquía de botones del conteo; filtro «Solo caducado» que falta.
5. [P3] Conteo a ciegas que enseña sobrante/faltante mientras se cuenta; códigos que se parten a 390.

## Persona red flags
- Mozo de almacén: pierde lo contado; Guardar lejos; no puede escanear para transferir; «Quedan» engaña.
- Alex: Enter no guarda en el conteo; filtro fuera de la URL.
- Sam: `aria-label` que tapa el contenido en transferencias; foco en la X del modal de almacén.
