---
target: panel principal
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
target_fingerprint: "sha256:a2021c684969478178aaab00a8b2627d51434651dbc209159419e5c059d2ad37"
target_path: "C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
timestamp: 2026-11-07T12-35-48Z
slug: src-modules-dashboard-components-dashboardpage-tsx
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica del proyecto pantalla por pantalla, 2026-11-06/07

## Panel principal (`/`), y para SELLER «Mis ventas de hoy» en `/counter` — 30/40, Buena

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | El «Reintentar» de la fila no cambiaba al pulsarlo (arreglado en bb51d7b) |
| 2 | Lenguaje del usuario | 3 | El panel cuenta lotes; `/expiry` abre hablando en unidades |
| 3 | Control y libertad | 3 | «Quitar filtro» en las listas de destino |
| 4 | Consistencia | 3 | El filtro de llegada se ve de dos maneras (frase o solo el selector) |
| 5 | Prevención de errores | 3 | La reposición sugerida va aparte y dice de dónde sale |
| 6 | Reconocer antes que recordar | 4 | Cada destino llega filtrado y con la misma cifra |
| 7 | Flexibilidad y eficiencia | 2 | En la tableta de SELLER, «Mis ventas de hoy» queda bajo el pliegue; USER sin acciones |
| 8 | Estética y minimalismo | 3 | Sin ventas, dos tarjetas repiten la misma frase |
| 9 | Recuperación de errores | 3 | USER y WAREHOUSE veían el aviso de un resumen que no tienen (arreglado en bb51d7b) |
| 10 | Ayuda | 3 | Ayudas en contexto buenas |
| **Total** | | **30/40** | **Buena** |

Detector: CLI limpia; en navegador solo los dos falsos positivos del proyecto (Inter fijada en PRODUCT.md; logo de las devtools de TanStack Query).

## Problemas prioritarios
1. [P2] Aviso general de fallo para quien no tiene resumen — arreglado (bb51d7b).
2. [P2] «Reintentar» de la fila sin estado propio — arreglado (bb51d7b).
3. [P2] En la tableta de SELLER, «Mis ventas de hoy» empieza fuera de la pantalla: dos columnas desde `lg` en el mostrador. layout/adapt.
4. [P3] `/expiry` no dice cuántos lotes son: «3 lotes · 30 uds.». clarify.

## Persona red flags
- Alex: sin atajos; «Reponer primero» abre movimientos, no la ficha.
- Sam: dos «Reintentar» en el fallo (resuelto); anillo de foco pegado al texto en los enlaces de acción.
- SELLER: sus ventas de hoy fuera de la vista en tableta.
- USER: panel de 3 filas sin acciones para reponer.
