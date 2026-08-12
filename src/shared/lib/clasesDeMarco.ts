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
export const CLASES_MARCO_CENTRADO = "min-h-screen bg-background flex items-center justify-center px-4";

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
