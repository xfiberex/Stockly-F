---
target: reportes, crítica de cierre de AUD-015 (media de 2; la peor, 23)
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\reports"
timestamp: 2026-11-19T00-31-44Z
slug: src-modules-reports
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica de cierre de AUD-015, 2026-11-18

## Notas por pantalla (Nielsen, 0–4)

| Heurística | Reportes | Por periodo |
|---|---|---|
| 1. Visibilidad del estado | 2 | 1 |
| 2. Lenguaje del usuario | 3 | 3 |
| 3. Control y libertad | 2 | 3 |
| 4. Consistencia | 2 | 2 |
| 5. Prevención de errores | 3 | 2 |
| 6. Reconocer antes que recordar | 3 | 3 |
| 7. Flexibilidad y eficiencia | 2 | 3 |
| 8. Estético y minimalista | 2 | 3 |
| 9. Recuperarse de errores | 1 | 1 |
| 10. Ayuda y documentación | 3 | 3 |
| **Total /40** | **23** | **24** |

Media 23,5/40 (antes 26,5: 25 y 28). Esta pasada miró los estados fuera del camino feliz —fallo de carga, red lenta, otro rol— que la del 2026-11-07 no vio. Cuatro P1: el criterio de AUD-015 (sin P1) no se cumple. Lo que AUD-015 arregló sí se sostiene: los gráficos no son paradas sin nombre (comprobado por A y B), el periodo vive en la URL y el vacío ofrece alternativas.

## Especificidad
Específico en el contenido (de qué resta sale cada margen, lo que queda fuera del cálculo, la zona horaria, disponible frente a stock); genérico en la forma (8 tarjetas iguales y tablas apiladas, sin jerarquía).
Detector: CLI limpia (0). Navegador, 7 vistas: `low-contrast` real en tema claro en las cabeceras de tabla (`text-foreground-muted` sobre `bg-surface-muted`, 4,3:1; el mismo patrón en todos los módulos con tablas); `overused-font` (Inter al 100 %, regla de gusto); `shape-assembled-illustration`, falso positivo (devtools de TanStack). Sin desbordes. Gráficos: ninguno enfocable fuera de `aria-hidden`; los tres con tabla y `caption`. Siete tablas visibles sin `caption` ni nombre. Objetivos pequeños a 390: «Ver cuáles» 60×15, «Volver a reportes» 133×20, enlaces de producto de 37 px.

## Problemas prioritarios
1. [P1] Cualquier rol ve los importes del negocio en Por periodo (ventas, compras, desglose, CSV y PDF): `GET /reports/period` es `TODOS` (`api.ts:170`) y el controlador no recorta como el resumen (`reports.controller.ts:44-91`). Contradice AUD-009 (CONTEXTO §6). Fix: omitir importes para quien no sea ADMIN (queda «unidades por periodo») o `SOLO_ADMIN`.
2. [P1] Por periodo puede enseñar cifras de otro periodo sin avisar: los campos de fecha no se sincronizan con `data.from/to` (`InformePorPeriodoPage.tsx:83-84, 98-101`), no usa `isFetching` ni `isError` (`:87`) con `keepPreviousData`; con red lenta, exportar saca el periodo anterior; sin red, la URL dice marzo y las cifras son de octubre–diciembre. Fix: sincronizar los campos, atenuar y desactivar exportar mientras llega, aviso de datos viejos o `ErrorDeCarga`.
3. [P1] Reportes queda en blanco si falla la carga (`ReportsPage.tsx:75`, `if (!data) return null`); Por periodo, esqueleto eterno (`:171`). Fix: `ErrorDeCarga` con Reintentar (design-system §8).
4. [P1] El «% margen realizado» (12,3 %) no dice que solo cuenta el 38 % de lo vendido (`ReportsPage.tsx:196-200`); el aviso está una sección más abajo. Fix: «Sobre el 38 % de lo vendido (con coste)» en la tarjeta, en ámbar bajo un umbral.
5. [P2] Sin jerarquía: «Reabastecer pronto» y el stock bajo, a ~3.000 px, tras gráficos y tops. Fix: bloque «Actuar» bajo las cifras, con enlace a Sugerencias; rotación recortada a 10.

## Personas
- Alex: tablas sin ordenar; Reportes sin CSV; ventanas fijas de 30 días y 6 meses; nombres de producto de Por periodo sin enlace; en móvil, los filtros ocupan la primera pantalla.
- Sam: cambiar de atajo no anuncia el rango nuevo; exportar desactivado sin decir por qué; `caption` que repite el `h2`; «Jun 26» suena a 26 de junio; siete tablas sin nombre (B).
- ADMIN: «$2,202,778 a venta» y «$1,102,153 a venta» en tarjetas vecinas; margen sobre el 38 % de lo vendido; rotación con 90 salidas frente a 0 vendidas en Por periodo (salidas que no son ventas); «Movimientos por mes» cuenta movimientos, no unidades; Por periodo sin margen.

## Menores
Cabeceras de tabla a 4,3:1 en claro (de todo el sistema). Leyendas en orden alfabético y no en el de las barras. Por periodo usa `fontSize:12` y no `TEXTO_DE_EJE`. Ventas aplastadas por compras en un mismo eje. Decimales distintos entre pantallas. La primera fila de tarjetas con icono y la segunda sin él. Meses futuros a 0 en «Este año» y «Este trimestre»; «al 30 nov» cuando hoy es 18. En móvil, la columna de importe fuera de la vista y el eje Y comiéndose medio ancho. Seis tarjetas a $0.00 encima del vacío. Palabras sueltas en las etiquetas de dos tarjetas a 390. Objetivos táctiles pequeños (ver detector).

## Preguntas
1. Si el 62 % de lo vendido no tiene coste, ¿debería Stockly enseñar un porcentaje de margen, o empujar antes a completar los costes?
2. ¿Reportes es para decidir hoy (reponer) o para entender (valor, margen)? Hoy intenta las dos.
3. ¿Por qué el informe por periodo no tiene margen, si el coste congelado en la línea ya existe?
