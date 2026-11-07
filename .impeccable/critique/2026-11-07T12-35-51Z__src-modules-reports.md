---
target: reportes (media de 2; reportes 25)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\reports"
timestamp: 2026-11-07T12-35-51Z
slug: src-modules-reports
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica del proyecto pantalla por pantalla, 2026-11-06/07

## Reportes — notas por pantalla

| Pantalla | Nota | Banda |
|---|---|---|
| Reportes (`reports/components/ReportsPage.tsx`) | 25/40 | Aceptable |
| Ventas y compras por periodo (`InformePorPeriodoPage.tsx`) | 28/40 | Buena |

Detector: CLI limpia; navegador, `unbalanced-heading` ×2 en `/reports` a 390 (`ReportsPage.tsx:189, 209`). Recharts avisa de un tamaño -1 en `/reports/period` (`InformePorPeriodoPage.tsx:171-172`), solo ruido de consola.

## Problemas prioritarios
1. [P1] Reportes: los KPI no cuadran a simple vista (venta − coste ≠ margen, porque coste y margen excluyen 27 productos y la venta no). La exclusión dentro de cada tarjeta y enlace a los productos sin coste. clarify.
2. [P1] Reportes: tres gráficos con `role="application"` y `tabindex="0"`, sin nombre ni tabla equivalente. El patrón del informe por periodo (`aria-hidden` + tabla). harden.
3. [P1] Por periodo: abre en «Este mes», vacío, con exportación activa de ceros. Sugerir «Mes anterior / Este año» y desactivar exportar. onboard/harden.
4. [P2] Eje de «Movimientos por mes» que se salta los meses vacíos; tarta de 9 categorías con 8 colores; ejes con el `#666` de Recharts; periodo fuera de la URL; ventas aplastadas por compras en una sola escala; tarjetas y tablas sin sentido a 390.

## Persona red flags
- ADMIN: KPI que no se pueden restar; informe que abre vacío.
- Sam: tres paradas «aplicación» mudas; cambio de periodo sin anunciar.
- Alex: sin ordenar tablas; rotación a 5.000 px de scroll.
- USER (AUD-009, solo diseño): ve lo mismo que ADMIN, con lo que no usa arriba.
