# Sistema de diseño de Stockly

Referencia para añadir pantallas sin volver a elegir valores. Si al escribir una página
necesitas decidir un hexadecimal, un tamaño de fuente o un radio, **falta algo aquí**:
esa decisión ya está tomada y el documento tiene un hueco.

Todo lo que sigue está definido en [`src/index.css`](../src/index.css) y comprobado por
tests. La columna «lo vigila» de cada sección dice cuál: no son recomendaciones, son
reglas que ponen la suite en rojo.

---

## La regla que gobierna el resto

> **El color comunica estado. Nunca decora.**

De ella salen casi todas las demás. Un badge azul no es «un badge bonito», es información:
azul significa *informativo*. Por eso la paleta no tiene colores sueltos —no hay `purple`
ni `teal`— y por eso ningún estado se comunica solo con color: siempre lleva además texto
e icono (WCAG 1.4.1).

Consecuencia práctica: si quieres distinguir dos cosas que **no** son estados distintos,
la herramienta no es el color. Es el peso tipográfico, el espaciado o el borde.

---

## 1. Color

Se nombra el **papel**, nunca el valor: `bg-surface`, no `bg-white`. Cambiar un token aquí
cambia la aplicación entera; ese es el objetivo.

### Superficies y texto

| Token | Utilidad | Valor | Contraste sobre blanco | Para qué |
|---|---|---|---|---|
| `--color-background` | `bg-background` | `#f8fafc` | — | Fondo de la página |
| `--color-surface` | `bg-surface` | `#ffffff` | — | Tarjetas, tablas, modales |
| `--color-surface-muted` | `bg-surface-muted` | `#f2f3f4` | — | Cabeceras de tabla, campos, zonas secundarias |
| `--color-border` | `border-border` | `#e6e8ea` | — | Todos los bordes |
| `--color-foreground` | `text-foreground` | `#0f172a` | **18.1:1** — AAA | Texto principal |
| `--color-foreground-muted` | `text-foreground-muted` | `#64748b` | **4.8:1** — AA | Metadatos, ayudas, texto secundario |

### Acción y acento

| Token | Utilidad | Valor | Contraste | Para qué |
|---|---|---|---|---|
| `--color-primary` | `bg-primary` | `#334155` | **10.4:1** — AAA | Acción primaria |
| `--color-accent` | `text-accent` | `#059669` | 3.8:1 | **Solo** bordes e indicadores |
| `--color-accent-strong` | `bg-accent-strong` | `#047857` | **5.5:1** — AA | Rellenos con texto encima |

> **El acento tiene dos valores a propósito.** Blanco sobre `--color-accent` da 3.77:1 y
> **falla AA** para texto normal. El suave sirve donde el mínimo es 3:1 —bordes,
> indicadores—; en cuanto haya texto encima, va el fuerte. Es el error fácil de esta
> paleta.

### Estados

Cada estado tiene un color de texto y una superficie propia para el fondo del badge.

| Estado | Texto | Superficie | Contraste |
|---|---|---|---|
| Éxito | `text-success` `#047857` | `bg-success-surface` `#ecfdf5` | 5.5:1 — AA |
| Aviso | `text-warning` `#b45309` | `bg-warning-surface` `#fffbeb` | 5.0:1 sobre blanco · 4.8:1 sobre su superficie |
| Peligro | `text-danger` `#b91c1c` | `bg-danger-surface` `#fef2f2` | 6.5:1 sobre blanco · 5.9:1 sobre su superficie |
| Información | `text-info` `#1d4ed8` | `bg-info-surface` `#eff6ff` | 6.7:1 — AA |

> **Los ratios se miden contra los dos fondos, no solo contra blanco.** El rojo original
> de la paleta (`#dc2626`) daba 4.8:1 sobre blanco —AA— pero **4.41 sobre su propia
> superficie de badge**, donde de hecho se usa. Por eso es `#b91c1c`. Al añadir un color,
> medir en el fondo real.

**Lo vigila:** [`src/tests/theme.test.ts`](../src/tests/theme.test.ts) recalcula todos los
ratios desde `index.css` con la fórmula WCAG 2.1, así que bajar de mínimos rompe la suite.
[`src/tests/tokens.test.ts`](../src/tests/tokens.test.ts) recorre `src/` y falla si aparece
una utilidad cruda de la paleta de Tailwind (`bg-slate-100`, `text-red-500`…).

---

## 2. Tipografía

**Inter**, subconjunto latino, cuatro pesos. La escala tiene **cinco tamaños y ninguno
más**: `--text-*: initial` borra los doce que Tailwind trae de serie, así que un `text-3xl`
escrito por inercia no pinta nada — no es que esté desaconsejado, es que no existe.

| Utilidad | Tamaño | Papel |
|---|---|---|
| `text-xs` | 12px / 16px | Metadatos, SKU, pies de tabla |
| `text-sm` | 14px / 20px | **Cuerpo y controles — el tamaño por defecto** |
| `text-base` | 16px / 24px | Título de sección dentro de una tarjeta |
| `text-xl` | 20px / 28px | Título de página secundaria, cifras destacadas |
| `text-2xl` | 24px / 32px | Título de página, KPI |

Pesos: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700).
Son exactamente los cuatro que se importan. `font-black` desapareció por la misma razón:
se usaba una vez y **no estaba cargado**, así que el navegador lo fingía engordando el 700.

Las tablas llevan `font-variant-numeric: tabular-nums` por regla de elemento, no celda a
celda: una tabla de inventario existe para comparar cifras en vertical, y las cifras
proporcionales de Inter desalinean las columnas. Cualquier tabla nueva nace alineada.

**Lo vigila:** [`src/tests/tipografia.test.ts`](../src/tests/tipografia.test.ts) comprueba
que los pesos declarados y los importados no se desalineen en ninguna de las dos
direcciones.

---

## 3. Forma: radios y elevación

### Radios — tres, según qué es la caja

| Utilidad | Para qué |
|---|---|
| `rounded-xl` | **Superficies**: tarjetas, modales, paneles de menú |
| `rounded-lg` | **Controles**: botones, campos, ítems de menú, contenedores de icono |
| `rounded-full` | **Píldoras**: badges, avatares, puntos de estado |

No hay un cuarto radio. El proyecto tuvo un `rounded-md` durante meses, usado una sola vez,
que no significaba nada distinto de los otros.

### Elevación — dos, según qué hace la caja

| Utilidad | Sombra | Para qué |
|---|---|---|
| `shadow-raised` | `0 1px 2px rgb(15 23 42 / 0.06)` | Lo que **se despega del fondo**: tarjetas |
| `shadow-overlay` | `0 8px 24px rgb(15 23 42 / 0.12)` | Lo que **se pone por encima**: modales, desplegables, botón flotante |

Las utilidades de sombra de Tailwind (`shadow-sm`, `shadow-lg`, `shadow-xl`) **no se usan**:
nombran un tamaño, no un papel, y por eso se elegían a ojo. Estas dos nombran la intención.

> **La jerarquía la da el borde, no la sombra.** Antes de subir una elevación, comprueba si
> lo que falta es un `border-border`.

**Lo vigila:** [`src/tests/elevacion.test.ts`](../src/tests/elevacion.test.ts) recorre `src/`
y falla nombrando archivo y clase si aparece un radio o una sombra fuera de estas listas.

---

## 4. Densidad y mínimo táctil

**Un componente, dos densidades.** No hay versión móvil y versión escritorio: el mismo
botón cambia de altura en el punto de ruptura.

```
min-h-11  →  44px  hasta `md`  — mínimo táctil: se pulsa con el pulgar
md:min-h-9 →  36px  desde `md`  — perfil denso: se apunta con el ratón
```

Ese par va en **todo control interactivo**: botones, campos, desplegables, el botón de
cerrar de los modales. Los controles cuadrados necesitan además `min-w-11`, o cumplirían de
alto y seguirían fallando de ancho — que es como estaba el de cerrar, 28×28.

**Lo vigila:** [`src/tests/components/densidad.test.tsx`](../src/tests/components/densidad.test.tsx),
variante por variante. Los píxeles reales se midieron en navegador; jsdom no resuelve `md:`,
así que el test blinda el par de clases que produce esa medida.

---

## 5. Estados: el semáforo

Todos los estados de la aplicación viven en
[`src/shared/lib/estados.ts`](../src/shared/lib/estados.ts), y cada uno trae **tres señales
redundantes**: texto, color e icono.

| Conjunto | Valores |
|---|---|
| `NIVEL_STOCK` | Correcto (éxito, ✓) · Bajo (aviso, ⚠) · Agotado (peligro, ✕) |
| `ACTIVIDAD` | Activo (éxito, ✓) · Inactivo (peligro, ⃠) |
| `ESTADO_ORDEN_COMPRA` | Pendiente (aviso, reloj) · Recibida (éxito, ✓) · Cancelada (peligro, ✕) |
| `ESTADO_ORDEN_VENTA` | Pendiente (aviso, reloj) · Enviado (éxito, camión) · Cancelado (peligro, ✕) |
| `TIPO_MOVIMIENTO` | Entrada (éxito, ↓) · Salida (peligro, ↑) · Ajuste (info, controles) · Importación (neutro, documento) |

Tres decisiones que conviene entender antes de tocarlas:

- **Un producto con stock correcto no lleva icono en la tabla.** La ausencia de marca
  también se distingue en escala de grises, y pintar un visto en cada fila sana ahogaría
  justo a las que piden atención.
- **Las etiquetas concuerdan en género** con el sustantivo de su módulo («la orden de
  compra» → «Cancelada»; «el pedido de venta» → «Cancelado»). Por eso hay dos mapas con los
  mismos colores e iconos.
- **Un estado desconocido no hereda color.** `buscarEstado()` devuelve la variante neutra
  con el código en crudo y un icono de interrogación: se ve que existe y que no se sabe qué
  es, en lugar de disfrazarse del último estado conocido.

Para pintarlos, `Badge` recibe el descriptor entero — nunca se eligen color e icono por
separado, que es como se separan.

**Lo vigila:** [`src/tests/components/estados.test.tsx`](../src/tests/components/estados.test.tsx)
comprueba que dos estados del mismo conjunto no compartan icono, y que el icono del badge
sea decorativo.

---

## 6. Iconos

Heroicons `24/outline`, la única fuente. La librería emite `aria-hidden="true"` en todos
sus iconos, así que **un icono nunca se anuncia**. Lo que sí hay que poner tú:

- Un icono junto a texto no necesita nada. El texto ya lo dice.
- Un botón de **solo icono** necesita `aria-label`, o se anuncia como «botón» y nada más.
- En una lista o tabla, ese `aria-label` debe **nombrar la fila**: `Editar Monitor LG`, no
  `Editar`. Cincuenta botones llamados «Editar» no dicen cuál.
- `title` da tooltip con el ratón y cuenta como nombre accesible de último recurso, pero
  **no se muestra en táctil**. Sirve de complemento, no de sustituto.

**Lo vigila:** [`src/tests/components/iconos.test.tsx`](../src/tests/components/iconos.test.tsx)
sobre el DOM renderizado, y las comprobaciones de nombre accesible de
[`ProductTable.test.tsx`](../src/tests/products/ProductTable.test.tsx).

---

## 7. Movimiento

`--ease-standard: cubic-bezier(0.2, 0, 0, 1)`, y dos duraciones fuera de `@theme` porque
Tailwind 4 no genera utilidades para ellas: `--duration-fast` (150ms) y `--duration-base`
(200ms), que se consumen como `duration-150` / `duration-200`.

Bajo `prefers-reduced-motion: reduce` todo se reduce a 0.01ms — **reducir, no eliminar**:
el estado final se queda donde debe y los `transitionend` que alguien escuche siguen
disparándose. El spinner es la excepción: comunica «esto sigue en marcha» girando, así que
en vez de congelarlo baja a una vuelta cada tres segundos.

**Lo vigila:** [`src/tests/movimiento.test.ts`](../src/tests/movimiento.test.ts).

---

## Cómo añadir una página nueva

1. Contenedor: `max-w-7xl mx-auto px-6 py-8 space-y-6`.
2. Título en `text-2xl font-bold text-foreground`; subtítulo o recuento en
   `text-sm text-foreground-muted`.
3. Cada bloque, una tarjeta: `bg-surface rounded-xl border border-border shadow-raised`.
4. Controles, siempre los componentes de [`src/shared/components/`](../src/shared/components/)
   —`Button`, `Input`, `Select`, `Modal`, `Badge`—. Traen densidad, foco y estados resueltos.
   Si algo **no puede ser un `<button>`** —una acción que navega—, usa `clasesDeBoton()`
   en el `<a>`; no copies la cadena de clases.
5. Estados, siempre desde `estados.ts`. Si el que necesitas no está, añádelo **ahí**, con
   sus tres señales a la vez.
6. Si algo flota (`fixed`), reserva su hueco en el contenedor: no ocupa sitio en el flujo y
   se planta sobre lo último de la página. Ya pasó con el botón flotante del catálogo, que
   dejaba la paginación **sin poder pulsarse**.

Si en algún punto tuviste que elegir un valor que no está en este documento, ese es el
hallazgo: apúntalo aquí antes de que se convierta en la próxima excepción.
