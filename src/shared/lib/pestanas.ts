/**
 * Lo que comparten `<Pestanas>` y los paneles que controla (AUD-018). Vive aparte del
 * componente porque un archivo de componentes solo exporta componentes (Fast Refresh).
 */

/** Los `id` que unen cada pestaña con su panel. Salen de aquí para que no se escriban dos veces. */
export const idDePestana = (base: string, valor: string) => `${base}-pestana-${valor}`;
export const idDePanel = (base: string, valor: string) => `${base}-panel-${valor}`;

/**
 * Lo que lleva el contenedor de cada panel. `tabIndex={0}` es lo que pide el patrón cuando el
 * panel puede empezar por algo que no se enfoca —un gráfico, un párrafo—: sin él, el
 * tabulador saltaría de la pestaña al primer control y se perdería el contenido de en medio.
 */
export function propsDePanel(base: string, valor: string) {
    return {
        role: "tabpanel",
        id: idDePanel(base, valor),
        "aria-labelledby": idDePestana(base, valor),
        tabIndex: 0,
    } as const;
}

/** El panel se enfoca con el tabulador, así que necesita su anillo como cualquier control. */
export const CLASES_PANEL_DE_PESTANA =
    "rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";
