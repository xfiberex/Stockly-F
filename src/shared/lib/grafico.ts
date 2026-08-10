/**
 * T4-03 — lo que los gráficos necesitan del tema, en un solo sitio.
 *
 * Recharts recibe los colores por props (`fill`, `stroke`, `contentStyle`), no por clases,
 * así que las utilidades de Tailwind no llegan y `tokens.test.ts` tampoco los veía: eran
 * unos cuarenta hexadecimales sueltos en tres archivos. Con el modo oscuro dejaron de ser
 * deuda estética — se quedaban en colores de tema claro sobre un fondo oscuro.
 *
 * **Se usan `var(--…)` en las props, no valores leídos con `getComputedStyle`.** Un
 * atributo de presentación de SVG se parsea como valor CSS, así que `fill="var(--x)"`
 * resuelve igual que por hoja de estilos **y responde al cambio de tema sin volver a
 * renderizar**. Comprobado en el navegador antes de escribir esto: la misma marca da
 * `rgb(59, 130, 246)` en claro y `rgb(96, 165, 250)` en oscuro, sin tocar React.
 * Leerlos con JavaScript habría exigido un hook, suscribirse al `matchMedia` y volver a
 * pintar; esto no necesita nada.
 */

/** Paleta **categórica**: para distinguir cosas que no son estados, como las porciones de
 *  una tarta por categoría. Lo que sí es un estado usa su token de estado. */
export const COLORES_DE_SERIE = Array.from({ length: 8 }, (_, i) => `var(--color-chart-${i + 1})`);

/** Rejilla de fondo de los ejes. */
export const COLOR_DE_REJILLA = "var(--color-chart-grid)";

/**
 * Estilo del tooltip de Recharts.
 *
 * Iba repetido seis veces con `border: "1px solid #e5e7eb"` y **sin fondo ni color de
 * texto**: heredaba el blanco por defecto de Recharts, que en modo oscuro habría dejado
 * una tarjeta blanca con texto claro encima —ilegible— flotando sobre la gráfica.
 */
export const ESTILO_DE_TOOLTIP = {
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-foreground)",
} as const;
