---
target: panel principal
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
target_fingerprint: "sha256:8a21c13fdef7ea63e672965049b0ea36f1091fd1e0e7c8b30c2fee9fccc9ba90"
target_path: "C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
timestamp: 2026-11-06T22-06-18Z
slug: src-modules-dashboard-components-dashboardpage-tsx
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador)

## Design Health Score

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | Al cargar, la fila atenuada es idéntica a una fila a cero (`AtencionDeHoy.tsx:240`) |
| 2 | Correspondencia con el mundo real | 3 | «9 lotes caducados o por caducar / 30 uds. ya caducadas» mezcla lotes y unidades |
| 3 | Control y libertad | 3 | `FiltroActivo` con «Quitar filtro» bien |
| 4 | Consistencia | 2 | El 4 de stock de ADMIN abre Sugerencias con 6 líneas; «Conteos» rápido sin filtrar y la fila filtrada; todo lo pendiente en ámbar |
| 5 | Prevención de errores | 3 | Sugerencias llega con 5 líneas marcadas y «Generar órdenes» a un clic desde una cifra que no coincide |
| 6 | Reconocer antes que recordar | 3 | En móvil la acción queda como flecha sola |
| 7 | Flexibilidad y eficiencia | 2 | SELLER pasa por un panel antes del mostrador; USER sin acciones rápidas |
| 8 | Estética y minimalismo | 3 | Gráfico vacío de $0 a $4; distintivo «Bajo» redundante |
| 9 | Recuperación de errores | 3 | Reintento ejemplar, pero el aviso muestra el texto crudo del servidor |
| 10 | Ayuda y documentación | 2 | Nada explica por qué la reposición sugerida difiere del recuento |
| **Total** | | **27/40** | **Aceptable** |

## Veredicto de especificidad
Específico en la mitad de arriba (panel «de hoy» por rol, lote que caduca antes, «Escanear» del almacén, «Mis ventas de hoy»). Genérico en el resumen de ADMIN (`DashboardPage.tsx:259-407`). Detector: CLI limpia (0); navegador: `straggler` real a 390 px en el detalle del lote caducado (`AtencionDeHoy.tsx:77-82`); `overused-font` (Inter, fijada en PRODUCT.md) y `shape-assembled-illustration` ×2 (logo de las devtools de TanStack Query, solo desarrollo) son falsos positivos.

## Problemas prioritarios
1. [P1] La cifra de stock de ADMIN no coincide con su destino (`AtencionDeHoy.tsx:96-99`): 4 productos → Sugerencias con 6 líneas distintas, a un clic de crear órdenes. Arreglo: `DESTINOS.stockBajo` para todos; «Generar reposición» como acción secundaria con su explicación. clarify, harden.
2. [P2] Todo lo pendiente en ámbar (`AtencionDeHoy.tsx:116,125,134,220`): colas neutras, ámbar para stock bajo, rojo para caducados/agotados; separar caducados de por caducar. quieter, clarify.
3. [P2] Almacén a una mano: «Escanear» fuera del pulgar; «Recibir compras» y «Conteos» duplican filas (`DashboardPage.tsx:166-195`); detalle rojo en 12 px. adapt.
4. [P2] El panel de SELLER es una antesala (`PanelDeVendedor.tsx:299-311`): 2/3 vacíos a 1024 px. distill, layout.
5. [P3] Final vacío de ADMIN (gráfico a $0) y error con texto del servidor (`ErrorDeCarga.tsx:51`). harden.

## Red flags por persona
- Alex: 4 → 6 en Sugerencias; sin atajos; más de 900 px hasta el final del resumen.
- Sam: cada cifra se lee dos veces; franja de recuentos sin encabezado (`DashboardPage.tsx:259`); `role="alert"` con texto técnico; lista sr-only con siete días a $0.00; anillo de foco pegado al texto (`AtencionDeHoy.tsx:30`).
- Mozo de almacén: «Escanear» arriba; caducados detrás del stock bajo; detalle en 12 px; «Reponer primero» no le toca.

## Observaciones menores
- Sin `/reports` a 1440 px, las filas se estiran y «Ver conteos» queda a ~1100 px de su etiqueta.
- «Reponer primero» lleva a `/movements`, no a la ficha.
- Straggler «2026» a 390 px (nbsp en la fecha o `text-wrap: pretty`).

## Preguntas
- Si el panel y Sugerencias no coinciden, ¿cuál es la verdad?
- ¿Qué decisión diaria toma ADMIN con el «Valor a precio de venta»?
- ¿Por qué SELLER tiene panel y no aterriza en el mostrador?
