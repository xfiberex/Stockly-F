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

### Modo oscuro y elección de tema

**No hay clases `dark:` ni una segunda paleta.** Cada color se declara **una vez, con sus dos
valores**, y el navegador elige:

```css
--color-surface: light-dark(#ffffff, #151d2c);
```

Lo que decide es el `color-scheme` efectivo, que hereda de `:root`. Ahí está todo el
conmutador — tres reglas de una línea:

```css
:root                     { color-scheme: light dark; }  /* auto: sigue al sistema */
:root[data-tema="claro"]  { color-scheme: light; }
:root[data-tema="oscuro"] { color-scheme: dark; }
```

El atributo lo pone el usuario desde **Configuración → Apariencia** (T4-11), se guarda en
`localStorage` y lo aplica un script en línea de `index.html` **antes del primer pintado**.
Sin ese script habría un fogonazo del tema contrario en cada carga, porque `main.tsx` es un
módulo y por tanto diferido.

Que la aplicación entera cambie con una variable es exactamente lo que hizo posible retirar
las 561 utilidades de color crudas.

| Token | Claro | Oscuro | Contraste en oscuro |
|---|---|---|---|
| `--color-background` | `#f8fafc` | `#0b1220` | — |
| `--color-surface` | `#ffffff` | `#151d2c` | 1.11:1 sobre el fondo |
| `--color-surface-muted` | `#f2f3f4` | `#1e2739` | — |
| `--color-border` | `#e6e8ea` | `#2f3a4d` | 1.47:1 *(en claro, 1.23)* |
| `--color-foreground` | `#0f172a` | `#e6ecf5` | **14.2:1** — AAA |
| `--color-foreground-muted` | `#64748b` | `#9aa8bd` | **7.0:1** — AAA |
| `--color-primary` | `#334155` | `#cbd5e1` | 11.4:1 como relleno |
| `--color-accent` | `#059669` | `#10b981` | 6.7:1 |
| `--color-success` | `#047857` | `#34d399` | 8.8:1 |
| `--color-warning` | `#b45309` | `#fbbf24` | 10.1:1 |
| `--color-danger` | `#b91c1c` | `#f87171` | 6.1:1 |
| `--color-info` | `#1d4ed8` | `#60a5fa` | 6.6:1 |

Cinco cosas que conviene entender antes de tocarlo:

- **No es la paleta clara invertida.** Los estados se **aclaran y desaturan**: invertir
  daría un rojo casi negro sobre fondo oscuro. Las superficies suben en escalones cortos
  —fondo → tarjeta → cabecera— porque en oscuro la jerarquía la da el escalón de
  luminancia, no la sombra.
- **`--color-primary` se aclara**, y por eso el botón primario pasa a claro con texto
  oscuro. Sale gratis porque los rellenos se pintan `bg-primary text-surface`, nunca
  `text-white` —que no aparece ni una vez en `src/`—: al invertir los dos tokens, el par se
  invierte solo.
- **El acento cambia de papel entre temas.** En claro, `--color-accent` no llega a 4.5:1 y
  por eso existe `--color-accent-strong` para los rellenos con texto. En oscuro el mismo
  verde da 6.7:1 y esa tensión desaparece. El test afirma cada cosa donde es cierta en vez
  de forzar la paleta oscura a cumplir una restricción que allí no aplica.
- **Los colores de etiqueta no cambian.** Los elige el usuario y se guardan en la base:
  son datos, no tema. Su legibilidad la resuelve `textoLegibleSobre()`, que calcula el
  contraste contra el color real de la etiqueta.
- **`color-scheme` no es solo el interruptor.** Es también lo que arrastra a los controles
  que ninguna hoja de estilos alcanza: barras de scroll, el desplegable de un `<select>`, el
  selector de fecha y el relleno automático de formularios.

Y dos trampas que ya costaron caras, las dos invisibles hasta que se miden en el navegador:

> **Las sombras no se pueden redefinir desde fuera.** Tailwind incrusta el color literal en
> la utilidad (`--tw-shadow: 0 8px 24px var(--tw-shadow-color, #0f172a1f)`) en vez de
> referenciar `var(--shadow-overlay)`, al revés que los colores. Redefinir el token en otro
> bloque **no hace nada, y no se nota**. Por eso el par va **dentro**:
> `--shadow-raised: 0 1px 2px light-dark(rgb(15 23 42 / 0.06), rgb(0 0 0 / 0.5))`.

> **`ring-offset-2` no deja un hueco transparente: lo rellena de blanco.**
> `--tw-ring-offset-color` vale `#fff` de fábrica, así que en oscuro el anillo de foco
> dibuja un halo. Quien pida hueco nombra también la superficie sobre la que flota:
> `ring-offset-2 ring-offset-surface`.

**Lo vigila:** [`src/tests/theme.test.ts`](../src/tests/theme.test.ts) recalcula todos los
ratios desde `index.css` con la fórmula WCAG 2.1 **para los dos temas**, exige que todo
`--color-*` declare sus dos valores, que no reaparezca ningún bloque
`@media (prefers-color-scheme: …)` —que ignoraría la elección del usuario— y que las sombras
lleven el par dentro. [`src/tests/tema.test.ts`](../src/tests/tema.test.ts) compara las tres
copias de la misma decisión: el módulo, el script en línea y los selectores del CSS.
[`src/tests/tokens.test.ts`](../src/tests/tokens.test.ts) recorre `src/` y falla si aparece
una utilidad cruda de la paleta de Tailwind (`bg-slate-100`, `text-red-500`…), un hexadecimal
en los tres componentes de gráficos o un `ring-offset` sin token.

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

Un botón **de solo icono** no es un botón estrecho: es cuadrado. `CLASES_BOTON_ICONO` quita
el relleno lateral y pone `min-w-11`. Los tres de cada fila de órdenes salían a 56 px cada
uno por el `px-4` heredado, y esos 168 px se los quitaban al texto de la fila.

### La navegación cambia de envoltorio, no de contenido

**A partir de 1024 px, barra lateral; por debajo, el panel desplegable de siempre.** Los dos
pintan la misma lista —`ListaDeSecciones`, en [`App.tsx`](../src/App.tsx)— a partir del mismo
array. Un destino nuevo se da de alta **una vez** y aparece en los dos sitios.

Hasta T4-10 no era así: la barra superior repartía los doce módulos en tres desplegables, de
modo que la mayoría de destinos costaban **dos interacciones** y ninguna decía dónde estabas;
y el panel de móvil los listaba en un orden distinto al de la barra, así que había dos
recorridos que mantener sincronizados a mano.

```
lg:  <header> marca + sesión   |  <nav aria-label="Secciones"> lateral, 240 px, sticky
     <main min-w-0 flex-1>
< lg: <header> marca + sesión + hamburguesa, con el panel colgando
```

Cuatro cosas que no son adorno:

- **La cabecera es `<header>`, no `<nav>`.** De `lg` en adelante ya no lleva ningún destino:
  marcarla como navegación deja un *landmark* que un lector de pantalla ofrece y que no
  lleva a ninguna parte.
- **Los dos `<nav>` llevan el mismo `aria-label`.** No chocan porque solo uno está visible a
  la vez: por debajo de `lg` el lateral es `display: none` y por encima lo es el panel, y lo
  que no se pinta no entra en el árbol de accesibilidad. `aria-hidden` sobraría.
- **`min-w-0` en el `<main>`.** En una fila flexible el mínimo de un elemento es su
  contenido, no cero: sin él, las tablas de `min-w-160` empujan el `<main>` fuera de la
  ventana y la página entera se desplaza a lo ancho, cabecera incluida. Es el mismo mecanismo
  del apartado «Un campo con `w-full` no reclama anchura», visto desde el otro lado.
- **Los subtítulos de grupo son `<p>`, no encabezados.** Rotulan un grupo de enlaces, no
  abren una sección de contenido: como `<h2>` se colarían en el listado de encabezados con el
  que se recorre la página, por delante del `<h1>` de la pantalla.

La sección actual se marca **dos veces**: `text-info` y el `aria-current="page"` que pone
`NavLink`. El color solo no vale (WCAG 1.4.1), y aquí quien no lo ve necesita saber en qué
sección está tanto como quien lo ve.

**Lo vigila:** [`navegacion.test.tsx`](../src/tests/components/navegacion.test.tsx) — el
orden, que los dos envoltorios pinten el mismo recorrido, que no quede ningún botón en el
lateral (un botón es la interacción de más que la tarea vino a quitar) y que la cabecera haya
dejado de ser un landmark de navegación.

### El armazón de una pantalla

Tres constantes en [`shared/lib/clasesDeEncabezado.ts`](../src/shared/lib/clasesDeEncabezado.ts),
no una cadena copiada en cada página. Medido a **412 px** (Galaxy S20 Ultra), que es el
ancho contra el que se revisa el móvil:

```
CLASES_CONTENEDOR_DE_PAGINA   px-4 en móvil, px-6 desde sm
CLASES_ENCABEZADO_DE_PAGINA   título y acciones apilados hasta sm
CLASES_ACCIONES_DE_ENCABEZADO rejilla de 2 columnas iguales hasta sm; la última impar, entera
```

**Las acciones van en rejilla y no en `flex-wrap`.** Con `flex-wrap` cada botón mide lo que
mide su palabra, así que el reparto de la fila lo decide la longitud del texto: «Exportar» e
«Importar» arriba y «Nuevo producto» descolgado debajo, a media anchura. En rejilla son dos
por fila del mismo ancho, y la impar de más ocupa la fila entera.

**Un desplegable se ancla al lado donde hay sitio.** El panel de `DropdownButton` mide 176 px
fijos: con `right-0` a secas y el disparador cerca del margen izquierdo, se dibujaba en
`left: -13px` y la primera letra de cada opción quedaba fuera de la pantalla. Hasta `sm` se
ancla a la izquierda —crece hacia el centro— y de `sm` en adelante vuelve a la derecha, que
es donde viven esos botones en escritorio.

**Lo vigila:** [`src/tests/desbordes.test.ts`](../src/tests/desbordes.test.ts). Encontró tres
pantallas más con el relleno de escritorio fijado —`audit-logs`, `dashboard` y `users`— que
no estaban en el repaso inicial.

### Un modal es una pantalla estrecha, no una pantalla pequeña

A 412 px el panel mide **380**, y con el relleno se queda en **348 de contenido**. Todo lo
que en la página cabe en dos columnas, aquí no. Por eso `Modal` lleva `px-4` hasta `sm`
—la misma regla que el contenedor de página— y el detalle de producto pasa a **una
columna** por debajo de `sm`: a dos quedaban 116 px de texto por campo, y no hay recorte de
`gap` que arregle eso, porque `12 ago 2026, 10:36 a.m.` no cabe en 116 px ni en `text-xs`.

**Las acciones de un modal se apilan hasta `sm`, y `flex-1` no es el reparto que parece.**
En una fila flexible el mínimo de un elemento es su contenido, así que dos botones `flex-1`
se reparten según **lo larga que sea su etiqueta**: medido, «Ver movimientos» a 146 px y
partido en dos líneas frente a «Editar producto» a 178 en una. Es el mismo mecanismo por el
que las acciones de encabezado van en rejilla y no en `flex-wrap`. Apilados miden los dos
348, y de `sm` en adelante vuelven a la fila con `sm:flex-1`.

Esto solo aplica a los modales con **acciones anchas**. Los ocho de formulario —`Cancelar` +
`Guardar`— caben de sobra alineados a la derecha: medido, 233 px de los 348.

**Un `<Button>` nunca va dentro de un `<Link>`.** Es HTML inválido y deja **dos paradas de
tabulación para una sola acción**. Una acción que navega es un enlace con `clasesDeBoton()`,
como dice el paso 4 de «Cómo añadir una página nueva». T2-14 lo quitó de la tabla de
productos y volvió en el modal de detalle; por eso ahora es una guardia y no un arreglo.

**Lo vigila:** [`accesibilidad.test.ts`](../src/tests/accesibilidad.test.ts) recorre `src/` y
falla nombrando el archivo si aparece un `<Button>` dentro de un `<Link>`.

### Tablas

Una tabla no cabe en un teléfono y no se pretende que quepa: **se desplaza a lo ancho**. Dos
constantes en [`shared/lib/clasesDeTabla.ts`](../src/shared/lib/clasesDeTabla.ts), y hacen
falta las dos:

```
CLASES_TABLA_DESPLAZABLE   el contenedor:  overflow-x-auto contain-paint sin-barra
CLASES_TABLA               la tabla:       w-full min-w-160 text-sm
```

**El ancho mínimo no es opcional.** Un `overflow-x-auto` sobre una tabla `w-full` no
desplaza nada: la tabla encoge hasta caber y lo que se rompe es el texto de las celdas,
partido por sílabas. El desplazamiento existe porque `min-w-160` la obliga a medir 640 px.

**Y el desplazador va dentro de la tarjeta, nunca en ella.** Media docena de tablas vivían
dentro de un `overflow-hidden` —puesto para recortar las esquinas redondeadas— que **anula
el desplazamiento**: a las columnas de la derecha no había forma de llegar. La tarjeta
conserva su `overflow-hidden` y el desplazador es un `div` interior.

**`sin-barra`** (utilidad propia, en `index.css`) oculta la barra sin quitar el
desplazamiento: sigue funcionando con el dedo, con `Shift`+rueda, con el teclado y para un
lector de pantalla. Lo que se pierde es la **señal visual** de que hay más a la derecha; es
una contrapartida aceptada a cambio de que la barra no se lea como parte de una tabla de
filas bajas.

**Ninguna columna se esconde en móvil.** Desde que las tablas se desplazan, un
`hidden md:table-cell` es una pérdida de información sin contrapartida: la fecha de un
registro de auditoría no es un adorno, y quien mira desde el teléfono la necesita igual.
Se quitaron los tres que quedaban —«Detalles» y «Fecha» en auditoría, «Registrado» en
usuarios—.

### Fechas

**Ningún campo de fecha usa el `<input type="date">` pelado.** Va por
[`CampoDeFecha`](../src/shared/components/CampoDeFecha.tsx), por el mismo motivo que
`Select` lleva `appearance-none`: el adorno nativo se alinea distinto en cada navegador —y
con las fechas, además, cambia de forma—. Reportado desde un Android real: los filtros de
movimientos salían vacíos y con un chevron de desplegable donde debía ir un calendario.

- El icono lo pinta el componente; el nativo se apaga.
- **Pista de formato propia** cuando el campo está vacío: `type="date"` ignora
  `placeholder` y Android no dibuja nada. Sale del catálogo, porque el formato cambia con
  el idioma. Y el texto nativo se apaga con `text-transparent` mientras la pista está
  puesta: Chrome de escritorio sí pinta el suyo y se veían **los dos superpuestos**.
- **Toda la caja abre el calendario**, no solo el icono: en `index.css` el indicador nativo
  se estira invisible sobre el campo entero. Un objetivo táctil de 16 px en una esquina es
  lo que el mínimo de 44 px quiere evitar.

### Un desplegable de filtro necesita nombre aunque se entienda mirándolo

**Todo `<Select>` lleva `label` o `aria-label`.** Lo vigila
[`accesibilidad.test.ts`](../src/tests/accesibilidad.test.ts), y no es una regla teórica: la
auditoría de T4-09 encontró **ocho sin ninguno de los dos**, en los filtros de productos,
auditoría, movimientos y usuarios.

Cuesta verlo porque el desplegable **sí enseña texto**: el de la opción elegida. Pero eso dice
el **valor** —«Todas las categorías»—, no de qué es el filtro. Mirando la pantalla se deduce
por su posición; sin mirarla, se anuncia «cuadro combinado» y se acabó.

Cuando no cabe una etiqueta visible, `aria-label` desde el catálogo. Nunca una cadena a mano:
`literales.test.ts` la caza.

### Las pantallas sin sesión también son pantallas

Las siete de autenticación y el 404 no pasan por `App.tsx`, así que **no heredan su `<main>`**
— y hasta T4-09 no tenían ningún landmark. Lighthouse lo marcaba en el login, que es la
primera pantalla del producto. Su marco es
[`CLASES_MARCO_CENTRADO`](../src/shared/lib/clasesDeMarco.ts), y el elemento es `<main>`.

**Un enlace metido en un párrafo lleva subrayado permanente**
(`CLASES_ENLACE_EN_TEXTO`). Con `hover:underline` a secas, en reposo lo único que lo separa
del texto de alrededor es el color: la misma regla —WCAG 1.4.1— por la que ningún estado de
este proyecto se comunica solo con color. Al pasar el ratón el subrayado **se quita**, que es
lo que confirma que responde. Un enlace suelto en un `div` no lo necesita: no hay texto del
que distinguirlo.

### Un campo con `w-full` no reclama anchura

`w-full` es un porcentaje, y un porcentaje **no aporta anchura intrínseca**: dentro de una
fila flexible el envoltorio no pide sitio y el campo se queda en su relleno. Al `Select` de
la columna de acciones de usuarios le pasaba exactamente eso —medido: **50 px de ancho, 48
de los cuales son `pl-3` + `pr-9`**—, así que se veía el chevron y ni una letra del rol.

Por eso `Select` lleva **`min-w-28`** en su clase base. Es del componente y no de la página:
el fallo no es de esa tabla, es de cualquier `Select` que caiga en un `flex`, y se rompe en
silencio —el desplegable sigue abriéndose y funcionando—.

Que la tabla crezca a lo ancho al hacerle sitio **no es un problema**: se desplaza, que es
justo lo que dice el apartado de tablas.

**Lo vigila:** [`Select.test.tsx`](../src/tests/components/Select.test.tsx).

### Lo que se pone encima, bloquea lo de debajo

El menú de navegación en móvil tapa la pantalla, y aun así la página seguía desplazándose
detrás: el gesto arrastraba el documento y el menú se iba con él. Hacen falta las tres
piezas, y ninguna sobra:

```
max-h-[calc(100dvh-3.5rem)]   el panel cabe y se desplaza por dentro   (dvh, no vh)
overscroll-contain            el gesto no continúa en el documento al llegar al final
overflow:hidden en <html>     bloqueo mientras está abierto            (no en <body>)
```

**`dvh` y no `vh`,** porque la barra del navegador móvil aparece y desaparece: con `vh` el
panel se dimensiona contra la ventana grande y las últimas entradas quedan bajo el borde.

**El bloqueo va en `<html>`, no en `<body>`,** y esto se midió: aquí el que desplaza es el
elemento raíz —`document.scrollingElement` es `<html>`—, así que bloquear el `body` deja
todo igual y parece hecho. Con el menú abierto, `overflow-y` de `<html>` pasa a `hidden` y
una rueda sobre el fondo mueve **0 px**.

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
- **Y si el control sí enseña texto, el `aria-label` tiene que contenerlo** (WCAG 2.5.3). El
  menú de usuario enseñaba «Admin Principal» y se anunciaba «Menú de usuario»: quien maneja
  el ordenador **por voz** dice lo que ve y no pasaba nada. Un `aria-label` no sustituye al
  texto visible, lo amplía.
- En una lista o tabla, ese `aria-label` debe **nombrar la fila**: `Editar Monitor LG`, no
  `Editar`. Cincuenta botones llamados «Editar» no dicen cuál.
- `title` da tooltip con el ratón y cuenta como nombre accesible de último recurso, pero
  **no se muestra en táctil**. Sirve de complemento, no de sustituto.

**Lo vigila:** [`src/tests/components/iconos.test.tsx`](../src/tests/components/iconos.test.tsx)
sobre el DOM renderizado, y las comprobaciones de nombre accesible de
[`ProductTable.test.tsx`](../src/tests/products/ProductTable.test.tsx).

---

## 7. Gráficos

Recharts recibe los colores **por props** (`fill`, `stroke`, `contentStyle`), no por
clases, así que las utilidades no llegan. Salen de
[`src/shared/lib/grafico.ts`](../src/shared/lib/grafico.ts) como `var(--color-…)`, que
funciona igual en un atributo de presentación de SVG **y responde al cambio de tema sin
volver a renderizar** — comprobado en el navegador: la misma marca da `rgb(59, 130, 246)`
en claro y `rgb(96, 165, 250)` en oscuro.

| Qué | De dónde |
|---|---|
| Series **categóricas** (porciones de una tarta por categoría) | `COLORES_DE_SERIE`, ocho tokens `--color-chart-1…8` |
| Rejilla de los ejes | `COLOR_DE_REJILLA` |
| Tooltip | `ESTILO_DE_TOOLTIP` |
| Cualquier cosa que sea un **estado** | su token de estado, no la paleta categórica |

Esa última fila es la regla de arriba aplicada a los gráficos: las entradas de stock van en
`--color-success`, las salidas en `--color-danger`, los ajustes en `--color-info` y la línea
de stock mínimo en `--color-warning`. El color categórico es solo para distinguir cosas que
no significan nada por sí mismas.

**Lo vigila:** [`src/tests/tokens.test.ts`](../src/tests/tokens.test.ts) falla si aparece un
hexadecimal en los tres componentes de gráficos. Hacía falta un test aparte: el que busca
utilidades crudas nunca los vio, porque `fill` no es una clase.

---

## 8. Movimiento

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
