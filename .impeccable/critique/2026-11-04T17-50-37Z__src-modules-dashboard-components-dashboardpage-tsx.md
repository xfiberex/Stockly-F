---
target: el panel principal
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\User\\Desktop\\Cursos y Proyectos\\14 - IA Mentor\\01-Stockly\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
target_fingerprint: "sha256:6877eb654514ce6ddfad4e6f455c8543e8199860513db01e1889eafc358beae1"
target_path: "C:\\Users\\User\\Desktop\\Cursos y Proyectos\\14 - IA Mentor\\01-Stockly\\Stockly-F\\src\\modules\\dashboard\\components\\DashboardPage.tsx"
timestamp: 2026-11-04T17-50-37Z
slug: src-modules-dashboard-components-dashboardpage-tsx
---
Método: dos agentes aislados (A: revisión de diseño · B: detector y navegador)

## Crítica del Panel: 27/40 (la primera dio 23)

### Puntuación

| # | Heurística | Nota | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 3 | La hora de los datos y el aviso de datos viejos son honestos, pero no se puede refrescar sin recargar |
| 2 | Relación con el mundo real | 3 | Buen vocabulario del dominio; pero «12 Categorías» no son 12 y «Reponer primero» no ordena por urgencia |
| 3 | Control y libertad | 3 | Atrás conserva la posición; reintentar pierde el foco |
| 4 | Consistencia | 3 | Tokens bien aplicados; pero «Ver informe», «Ver reporte completo» y «Reportes» llevan al mismo sitio y el gráfico se sale del sistema |
| 5 | Prevención de errores | 2 | «—» (no disponible) se ve igual que un cero; el botón del vendedor salta 174 px al cargar |
| 6 | Reconocer antes que recordar | 3 | Las filas se explican solas, pero la cifra hay que recordarla al llegar al destino |
| 7 | Flexibilidad y eficiencia | 2 | Ningún enlace llega filtrado; el gráfico es una parada de teclado que el lector no anuncia |
| 8 | Estética y minimalismo | 3 | Sobrio, pero las cifras que piden actuar (20 px) son más pequeñas que las que solo se leen (24 px) |
| 9 | Recuperación de errores | 2 | Mensajes claros y fallos parciales aislados, pero reintentar sin datos cambia toda la pantalla por un esqueleto |
| 10 | Ayuda | 3 | Buenas ayudas en contexto («Venta menos coste…»); el aviso de productos sin coste no lleva a ningún sitio |
| **Total** | | **27/40** | **Aceptable**, en el borde alto: 28 ya sería «Bueno» |

### Veredicto de especificidad

**Revisión de diseño.** La mitad de arriba es claramente de Stockly:
- «Necesita atención» cambia por rol y habla del dominio: lotes caducados, conteos abiertos, compras por recibir.
- Cada fila trae su verbo.
- El panel del vendedor gira en torno a una sola acción.

La de abajo es la plantilla de cualquier admin: franja de tres recuentos, fila de tres importes, barras a dos tercios y un top 5 al lado. Lo que solo tiene Stockly no aparece en la primera pantalla:
- **El escáner**: el almacén no tiene ninguna entrada.
- **Los almacenes**: ninguna cifra dice de cuál es.
- **Los lotes**: la campana dice «lote L-20261030 de Yogur natural, caduca 30 oct»; el panel, solo «8».
- **Las compras vencidas**: la campana las distingue; el panel pinta todas las pendientes en el mismo ámbar.

**Detector.** La herramienta de línea de comandos da 0 hallazgos, pero ese 0 no prueba nada: en archivos `.tsx` solo aplica reglas de texto y no mide contraste ni tamaños. En el navegador salen tres reglas en las cuatro vistas:
- **`overused-font`** (Inter en el 100 % del texto): es cierto, pero es la fuente fijada en PRODUCT.md y en el sistema de diseño, así que no se toca. Coincide con la revisión: el aspecto es el de un admin de Tailwind por defecto.
- **`shape-assembled-illustration` ×2**: **falso positivo**. Es el logo del botón de las devtools de TanStack Query, que solo existe en desarrollo (`src/main.tsx:17`).
- **`straggler`**, solo en ADMIN a 390 px: «potencial.» queda sola en la última línea del aviso de productos sin coste (`DashboardPage.tsx:182`). La revisión señala ese mismo aviso por otro motivo: ocupa tres líneas ámbar en móvil y no lleva a ningún sitio.
- **Lo que el detector no vio**: el contraste de los ejes del gráfico en tema oscuro (problema 5), porque no analiza ese texto SVG.

**Marcas en el navegador.** Se ven en la pestaña **[Human] Panel · Stockly** (ADMIN, 1440×900) del Chrome que controla DevTools. Está en segundo plano y el banner de arriba se cierra con ×.

### Impresión general

El panel ha mejorado de verdad: lo de hoy va primero, cada rol ve lo suyo y un fallo de la API ya no deja la pantalla vacía. Lo que falla es que «Necesita atención» promete más de lo que cumple. Su cifra no se mantiene al llegar al destino, y mientras carga o se reintenta, el bloque desaparece. La mayor oportunidad es que cada cifra lleve a una lista que muestre exactamente esa cifra.

### Lo que funciona

1. **«Necesita atención» va primero, por rol y con verbo.** Cada fila es cifra, frase y acción; a cero se atenúa, pasa a ✓ y pierde el enlace.
2. **Es honesto ante los fallos.**
   - Con `/reports` caído siguen las cifras de conteos, compras y ventas.
   - Los datos viejos se quedan con su hora.
   - La semántica es correcta: `status`, una lista oculta con las cifras del gráfico para el lector de pantalla y `<dl>` en los importes.
3. **Cada rol ve lo suyo y el móvil está bien resuelto.** El vendedor no ve importes. A 390 px cada fila es un blanco táctil de 52–61 px a todo lo ancho, y al 200 % de zoom no hay scroll horizontal.

### Problemas prioritarios

1. **[P1] Los enlaces de «Necesita atención» olvidan el filtro de su cifra.**
   - **Qué pasa:**
     - «4 · Ventas por enviar → Ver ventas» abre `/sale-orders` con «Todos los estados · 28 órdenes».
     - Ocurre lo mismo en compras, conteos y caducidades (`AtencionDeHoy.tsx:87-111`).
     - «Ver 11 más» lleva al informe, no a la lista (`:163`).
     - Las listas guardan sus filtros en el estado del componente, no en la URL.
   - **Por qué importa:** es la queja de «los números no cuadran», y justo en el bloque que da sentido al panel.
   - **Arreglo:** filtros en la URL de las listas de destino (`?estado=PENDING`, `?stock=bajo`…), enlaces del panel con esos parámetros y el mismo recuento visible al llegar.
   - **Comando:** `/impeccable shape`
2. **[P1] Mientras `/reports` carga o se reintenta, todo el panel se cambia por un esqueleto genérico.**
   - **Qué pasa:** `DashboardPage.tsx:80` devuelve `EsqueletoPagina cifras={4}` siempre que no hay datos del informe. Eso tiene tres efectos:
     - **Al reintentar sin datos**, TanStack Query v5 vuelve a `pending` y desaparecen el error y «Necesita atención», que ya estaba cargado. El giro del botón no llega a verse y el foco cae en `<body>`.
     - **Las cifras de atención esperan a `/reports`**: el bloque no se monta hasta que llega el informe, aunque solo su fila de stock depende de él. Con Slow 4G sus consultas empezaron a los 11,3 s.
     - **El esqueleto dibuja 4 tarjetas** de cifras que ya no existen.
   - **Con datos ya cargados**, el «Reintentar» en línea (`:126`) mide 69×20 px en móvil y no da ninguna señal mientras trabaja.
   - **Por qué importa:** con teclado o lector de pantalla hay que recorrer otra vez la cabecera y la barra lateral. En un almacén con mala cobertura, lo urgente llega lo último.
   - **Arreglo:**
     - Montar «Necesita atención» desde el principio, con la fila de stock cargando, y dejar el esqueleto solo para los bloques de negocio.
     - Mantener el error en pantalla mientras se reintenta (`!data && errorUpdateCount > 0`) y devolver el foco al botón.
     - Dar al reintento en línea `aria-busy` y un blanco de 44 px, y que vuelva a pedir también las cifras de atención.
   - **Comando:** `/impeccable harden`
3. **[P2] Cifras que no son la verdad.**
   - **«12 Categorías»** cuenta los grupos de stock, «Sin categoría» incluido (`DashboardPage.tsx:100`, `reports.service.ts:373`). Hay 11, y la cifra enlaza a esa lista.
   - **«Reponer primero»** ordena por stock absoluto (`reports.service.ts:439`), y `minStock` vale 0 por defecto. Los productos a 0 con mínimo 0 ocupan 3 de los 5 puestos y tapan las faltas reales (4 de 5, 8 de 10).
   - **«—» (no disponible)** se pinta en el mismo gris que una fila a cero (`AtencionDeHoy.tsx:179`).
   - **Arreglo:**
     - Contar las categorías reales, o rotular «Categorías con stock».
     - Ordenar por falta frente al mínimo y tratar «mín. 0» como «sin mínimo».
     - Mostrar «No disponible» en tono de aviso.
   - **Comando:** `/impeccable clarify`
4. **[P2] El botón principal del vendedor salta y encoge.**
   - **Qué pasa:**
     - «Ir a mostrador» sube 174 px cuando llegan las ventas: el esqueleto reserva 3 filas (`PanelDeVendedor.tsx:54`) y la tarjeta usa `justify-between` dentro de una fila estirada (`:30`).
     - En tableta táctil (1024 px) mide 40 px de alto, porque `md:min-h-9` de la base del botón (`clasesDeBoton.ts:20`) gana a `min-h-12`.
   - **Por qué importa:** con el cliente delante, un botón que se mueve es un toque fallido.
   - **Arreglo:** botón arriba o con `self-start`, esqueleto con la forma real de la lista y altura según el tipo de puntero (`pointer: coarse`), no según el ancho.
   - **Comando:** `/impeccable adapt`
5. **[P2] El gráfico de ventas se sale del sistema.**
   - **Qué pasa:**
     - **Contraste:** en tema oscuro, las etiquetas de los ejes son `#666` sobre `#151d2c`, 2,94:1 a 11 px. No cumple WCAG 1.4.3, y 11 px no está en la escala (`DashboardPage.tsx:211`).
     - **Cursor:** el `#ccc` del cursor deslumbra en oscuro.
     - **Lector de pantalla:** el gráfico recibe el foco pero está dentro de un `aria-hidden` (`:207`), así que el lector no anuncia nada.
     - **Escala:** los $321 de hoy no se ven al lado del pico de $361k, y el día de hoy no se marca.
   - **Arreglo:** etiquetas con `var(--color-foreground-muted)` a 12 px, cursor con un token del sistema, `accessibilityLayer={false}` y el día de hoy marcado.
   - **Comando:** `/impeccable polish`

### Señales por persona

- **Alex (teclado y prisa):**
  - Tiene que volver a filtrar en cada destino.
  - El gráfico se mete en el orden de tabulación.
  - No hay refresco ni atajos.
  - Lo bueno: el primer Tab cae en «Generar reposición».
- **Sam (lector de pantalla, zoom al 200 %):**
  - El foco va a `<body>` tras reintentar.
  - El bloque de importes no tiene encabezado, así que la navegación por encabezados lo salta.
  - En móvil, el nombre accesible de cada fila («Ver caducidades») no contiene el texto visible (WCAG 2.5.3).
  - Lo bueno: al 200 % no hay scroll horizontal.
- **Sofía (vendedora, con tableta en el mostrador):**
  - Sus ventas no son enlaces, así que no puede reabrir la #000027 para reimprimir el comprobante.
  - Ve «hace 1 hora» en vez de la hora del ticket.
  - «Ver todas las ventas» no filtra por ella ni por hoy.
  - En el código, se piden como mucho 100 ventas del día de **todos** los vendedores y luego se filtran las suyas (`useMisVentasDeHoy.ts:22`). Un día con más de 100, su resumen se queda corto sin avisar.
- **Mateo (almacén, de pie con el móvil):**
  - No tiene acción principal (escanear, registrar una entrada, contar): todo pasa por el menú de arriba, lejos del pulgar.
  - Las cifras no dicen de qué almacén son.
  - «Ver informe» lo lleva a Reportes, que según el código no filtra por rol: ahí vería los importes que el panel le oculta.

### Observaciones menores

- **Jerarquía de tamaños:** las cifras de «Necesita atención» (20 px) son más pequeñas que los recuentos e importes, que solo se leen (24 px).
- **Mismo destino:** «Total productos» y «Productos activos» llevan a la misma lista sin filtrar.
- **Textos:**
  - «Ir a mostrador» → «Ir al mostrador» (`es.ts:1136`).
  - «Total productos» → «Total de productos» (`es.ts:1089`).
  - La hora sale con cero delante («01:26 p.m.»).
  - `en.ts:1093` acaba en punto; en español ese punto se quitó a propósito.
- **Gráfico:**
  - El tooltip dice «Importe : $0.00», con un espacio antes de los dos puntos.
  - El eje Y no tiene escalón de millones: $1 500 000 saldría como «$1500k».
  - La rejilla vertical sobra en un gráfico de barras.
- **«Más vendidos»:** los nombres se cortan sin `title`, y en escritorio la tarjeta queda medio vacía.
- **Altura de las filas:** al cargar, las de atención crecen de 44 a 53–61 px cuando llega su enlace.
- **Campana y panel:** avisan de lo mismo sin remitir el uno al otro, y la campana es más concreta.

### Preguntas para pensar

1. Si «Necesita atención» es la razón de ser del panel, ¿por qué espera a la consulta más pesada y olvida su filtro? ¿Y si para el almacén y el rol USER ese bloque **fuera** el panel, y el resumen de negocio viviera en Informes?
2. El vendedor tiene un panel construido alrededor de su acción; quien usa la cámara, no. ¿Cómo sería el inicio del almacén si empezara por «Escanear» y por *su* almacén?
3. Si casi toda visita del vendedor acaba en «Ir a mostrador», ¿no debería entrar directamente en `/counter`?
4. «Reponer primero» promete una prioridad. ¿Cuál: stock absoluto, falta frente al mínimo o días hasta agotarse?

### Cómo se hizo

- **Navegador:**
  - ADMIN a 1440 y 390 px, vendedor a 1024 px táctil y almacén a 390 px, en claro y oscuro.
  - Zoom al 200 %, los dos estados de error de `/reports` y red Slow 4G.
- **Sin probar:**
  - Lector de pantalla real: solo se revisó el árbol de accesibilidad.
  - Dispositivos físicos.
  - El rol USER y la interfaz en inglés, que solo se miraron en el código.
- **Código:** las causas de los cinco problemas prioritarios están comprobadas en el código.
