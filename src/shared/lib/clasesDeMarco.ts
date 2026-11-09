/**
 * El marco de las pantallas que se ven **fuera** de la aplicación: autenticación y 404.
 *
 * No comparten el armazón de `App.tsx` —no hay barra de navegación cuando aún no hay
 * sesión—, así que hasta T4-09 tampoco tenían **landmark `<main>`**: Lighthouse lo marcaba
 * como fallo en el login, que es literalmente la primera pantalla del producto. Un lector de
 * pantalla sin landmarks pierde el atajo para saltar al contenido y solo puede recorrer la
 * página de arriba abajo.
 *
 * La cadena estaba copiada en las siete pantallas. Ahora es una, y el elemento correcto lo
 * pone quien la usa: `<main>`, no `<div>`.
 */
// AUD-014 — `py-6`: en un móvil apaisado la tarjeta es más alta que la pantalla y tocaba los
// bordes. Y centrada **solo en horizontal**, arriba a un sexto de la pantalla: centrada también en
// vertical, al aparecer un aviso la tarjeta crecía por los dos lados y el botón que se acababa de
// pulsar se movía debajo del dedo.
export const CLASES_MARCO_CENTRADO = "min-h-screen bg-background flex items-start justify-center px-4 py-6 sm:pt-[16vh]";

/** Variante en columna, para las pantallas que apilan mensaje y botón (404, verificación). */
export const CLASES_MARCO_CENTRADO_COLUMNA =
    "min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4";

/**
 * Un enlace **dentro de un bloque de texto**.
 *
 * `text-info hover:underline` no basta y Lighthouse lo señala (`link-in-text-block`): con el
 * subrayado solo al pasar el ratón, lo único que distingue al enlace del texto que lo rodea
 * es **el color**, y eso deja fuera a quien no lo percibe — la misma regla (WCAG 1.4.1) por
 * la que ningún estado de este proyecto se comunica solo con color. Con el ratón encima el
 * subrayado se quita, que es el gesto que confirma que es pulsable.
 *
 * Un enlace **aislado** —un botón de «Volver», un elemento de navegación— no lo necesita: la
 * regla habla de enlaces embebidos en texto corrido, donde no hay nada más que los separe.
 */
export const CLASES_ENLACE_EN_TEXTO = "text-info underline underline-offset-2 hover:no-underline";

/**
 * AUD-014 — un enlace **suelto** («Volver al inicio de sesión», «¿Olvidaste tu contraseña?»)
 * con 44 px de alto en táctil, como los botones (`docs/design-system.md` §4). Con ratón vuelve a
 * su altura de texto. No va en un enlace dentro de una frase: estiraría la línea.
 */
export const CLASES_ENLACE_SUELTO = "inline-flex min-h-11 items-center md:pointer-fine:min-h-0";
