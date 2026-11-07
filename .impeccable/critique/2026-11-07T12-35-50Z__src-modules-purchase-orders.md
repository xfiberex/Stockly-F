---
target: órdenes y clientes (media de 6; la peor, 24)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 5
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\08 - Proyectos con el Stack PERN\\Stockly - Gestor de Inventario Profesional\\Stockly-F\\src\\modules\\purchase-orders"
timestamp: 2026-11-07T12-35-50Z
slug: src-modules-purchase-orders
---
Method: dual-agent (A: revisión de diseño · B: detector + navegador) — crítica del proyecto pantalla por pantalla, 2026-11-06/07

## Órdenes y clientes — notas por pantalla

| Pantalla | Nota | Banda |
|---|---|---|
| Órdenes de compra (`purchase-orders/components/PurchaseOrdersPage.tsx`) | 24/40 | Aceptable |
| Sugerencias de reposición (`SugerenciasReposicionPage.tsx`) | 27/40 | Aceptable |
| Órdenes de venta (`sale-orders/components/SaleOrdersPage.tsx`) | 25/40 | Aceptable |
| Mostrador (`MostradorPage.tsx` + `MisVentasDeHoy.tsx`) | 27/40 | Aceptable |
| Clientes (`customers/components/CustomersPage.tsx`) | 29/40 | Buena |
| Ficha de cliente (`CustomerDetailPage.tsx`) | 28/40 | Buena |

Detector: CLI limpia; navegador, solo `straggler` ×2 en `/sale-orders` a 390 («Central» sola en la línea de metadatos, `SaleOrdersPage.tsx:618`).

## Problemas prioritarios
1. [P1] Recepción de compras a 390: el campo «Llega ahora» empieza en x=576 con un viewport de 390 y la barra oculta. Tarjetas por línea. adapt.
2. [P1] Cancelar o eliminar una compra pendiente, y marcar enviada / cancelar / eliminar una venta pendiente, actúan al primer toque. harden.
3. [P1] Sugerencias: el comprador genera órdenes sin ver ningún importe. Subtotales, total por proveedor y confirmación «2 órdenes · $X». clarify.
4. [P1] Mostrador: total y «Registrar venta» bajo el pliegue (a 390 con 2 líneas; a 1024 con 3). Barra fija abajo, dos columnas en tableta. layout.
5. [P1] Mostrador: la venta armada se pierde sin aviso al recargar o navegar. sessionStorage + bloqueo de navegación. harden.
6. [P2] Filas desplegables de Compras y Ventas como `div` con `onClick` (sin teclado ni `aria-expanded`); nombre de cliente en `text-accent` ~3,8:1 (falla AA); la ficha de cliente rotula «Total» lo que es el subtotal; números de compra como trozo de UUID; filtros de Ventas que ocupan media pantalla en móvil; al paginar Sugerencias se pierden las ediciones.

## Persona red flags
- WAREHOUSE: el modal de recepción esconde las cantidades en el móvil.
- SELLER: cobra bajo el pliegue y puede perder la venta en curso.
- Comprador: sin totales en las sugerencias; IDs hexadecimales imposibles de dictar.
- Sam: filas que no se despliegan con teclado; enlace verde sin contraste.
