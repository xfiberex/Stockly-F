---
target: el panel principal
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
target_fingerprint: "sha256:71d3417c3cfc631172147bedc6b1e5da5a45b5661b7c3b597d3b2c928422d8c9"
target_path: "C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
timestamp: 2026-11-03T16-39-14Z
slug: src-modules-dashboard-components-dashboardpage-tsx
---
# Crítica: panel principal (DashboardPage.tsx)

Method: dual-agent (A: revisión de diseño · B: detector + navegador)

## Puntuación (Nielsen)
| # | Heurística | Nota | Problema principal |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Sin hora de actualización; si la carga falla, el esqueleto se queda para siempre (l.24) |
| 2 | Lenguaje del usuario | 3 | Título «Dashboard» en inglés (es.ts:72); faltan lote, almacén, OC |
| 3 | Control y libertad | 3 | Solo lectura; sin filtro de almacén ni periodo |
| 4 | Consistencia | 2 | Color decorativo, agotado sin rojo, tarjetas sin sombra (design-system §1, §3, §5) |
| 5 | Prevención de errores | 2 | Margen potencial no cuadra a simple vista; gráfico de doble eje |
| 6 | Reconocer, no recordar | 2 | Gráfico por categoría sin leyenda |
| 7 | Flexibilidad y eficiencia | 1 | Sin acciones directas ni variante por rol |
| 8 | Estética y minimalismo | 3 | Sobran «Categorías: 9» y el enlace del pie |
| 9 | Recuperarse de errores | 1 | Sin estado de error ni «Reintentar» |
| 10 | Ayuda | 3 | Notas en línea bien escritas |
| Total | | 23/40 | Aceptable |

## Especificidad
~70 % plantilla de SaaS genérica. Faltan lotes por caducar, almacenes, OC pendientes, ventas por enviar, conteos y reposición. Detector: código limpio; en navegador, overused-font (Inter 100 %, real, baja prioridad) y shape-assembled-illustration (falso positivo: logo de TanStack Devtools).

## Problemas prioritarios
1. [P1] Lo urgente (alerta de stock bajo, l.205-235) está al final y no lleva a reponer. Arreglo: bloque «Necesita atención» arriba con stock bajo/agotado (Badge + NIVEL_STOCK), caducidades, OC pendientes, ventas por enviar, cada uno con acción. → layout + clarify
2. [P1] Sin estado de error: `if (isLoading || !data)` (l.24) ignora isError. Arreglo: mensaje + «Reintentar» (refetch). → harden
3. [P1] Gráfico «Stock y valor por categoría» (l.180-203): doble eje sin leyenda, «$0k», 3/9 categorías en móvil, sin alternativa sr-only. Arreglo: barras horizontales de una métrica + lista accesible, o moverlo a Informes. → distill
4. [P2] Cifras sin explicar (margen potencial sobre productos con coste) y color decorativo en l.45-46 y l.88. → quieter + clarify
5. [P2] Mismo panel para los 4 roles; SELLER ve margen y valor a coste; WAREHOUSE sin caducidades ni conteos. → adapt

## Personas
- Alex: sin acciones directas ni atajos; 7 días fijos; «Ver N más» a informe genérico.
- Sam: gráfico por categoría vacío para el lector; alerta sin role; enlaces de la alerta <44 px en móvil; «→» dentro del nombre del enlace.
- Admin a primera hora: cifras de catálogo arriba; reponer exige bajar al final y lleva a movimientos; no ve OC en camino ni lotes por caducar.

## Menores
«Más vendidos» con 1 elemento; sin comparación semanal; en móvil la cantidad se pega al nombre en la alerta y el eje X va apretado (11 px); «Gestionar productos →» duplicado (l.238); Total y Activos al mismo destino; space-y-8 en vez de space-y-6; clases de fondo en conflicto (l.66); sin hora de actualización; Inter al 100 %.

## Preguntas
1. ¿«Qué hacer hoy» o «cuánto vale el inventario»?
2. ¿Por qué un SELLER ve el margen del negocio?
3. ¿Qué decisión se toma viendo «9 Categorías»?
