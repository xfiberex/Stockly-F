import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLASES_BARRA_FIJA_HASTA_LG, CLASES_BARRA_FIJA_HASTA_SM } from "@/shared/lib/clasesDeBarraFija";
import { CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

/**
 * AUD-013 — el móvil de quien trabaja de pie, medido a 390 px en el navegador al cerrar la tarea.
 * jsdom no aplica CSS, así que esto no mide: fija las clases que hacen el trabajo, para que nadie
 * las quite sin que algo falle. Lo medido (y=…, x=…) está en la ficha del ROADMAP.
 */

const fuente = (ruta: string) => readFileSync(join(__dirname, "..", ruta), "utf8");

describe("El móvil de quien trabaja de pie (AUD-013)", () => {
    it("las barras fijas vuelven a su sitio desde su ancho y reservan el borde seguro del iPhone", () => {
        expect(CLASES_BARRA_FIJA_HASTA_SM).toMatch(/^fixed inset-x-0 bottom-0 /);
        expect(CLASES_BARRA_FIJA_HASTA_SM).toContain("sm:static");
        expect(CLASES_BARRA_FIJA_HASTA_LG).toContain("lg:static");
        for (const clases of [CLASES_BARRA_FIJA_HASTA_SM, CLASES_BARRA_FIJA_HASTA_LG]) {
            expect(clases).toContain("env(safe-area-inset-bottom)");
        }
    });

    it("Productos: en el móvil, la tabla se queda con nombre, stock y acciones, sin ancho mínimo", () => {
        const tabla = fuente("modules/products/components/ProductTable.tsx");
        expect(tabla).toContain(`cn(CLASES_TABLA, "max-md:min-w-0")`);
        // Seis columnas ocultas por debajo de `md` (cabecera y celda de cada una).
        expect(tabla.match(/hidden md:table-cell/g)).toHaveLength(12);
        // El stock no es una de ellas.
        expect(tabla).not.toMatch(/hidden md:table-cell[^"]*">\{t\("productos\.tabla\.stockMin"\)/);
    });

    it("Productos: la leyenda ABC no se pinta en el móvil, donde tampoco está la columna", () => {
        expect(fuente("modules/products/components/ProductsPage.tsx")).toMatch(/"text-xs text-foreground-muted max-md:hidden"/);
    });

    it("la recepción de compras se queda con producto y «Llega ahora» en el móvil", () => {
        const pagina = fuente("modules/purchase-orders/components/PurchaseOrdersPage.tsx");
        expect(pagina).toContain(`cn(CLASES_TABLA, "max-sm:min-w-0")`);
        expect(pagina).toContain(`t("compras.recepcion.pedidoYRecibido"`);
    });

    it("el conteo lleva «Guardar» en la barra fija y reserva su hueco", () => {
        const pagina = fuente("modules/inventory-counts/components/InventoryCountPage.tsx");
        expect(pagina).toContain("<div className={CLASES_BARRA_FIJA_HASTA_SM}>");
        expect(pagina).toContain(`vistaActual === "contar" && "max-sm:pb-28"`);
    });

    it("el mostrador lleva el cobro en la barra fija hasta `lg`, y desde ahí va en dos columnas", () => {
        const pagina = fuente("modules/sale-orders/components/MostradorPage.tsx");
        expect(pagina).toContain("cn(CLASES_BARRA_FIJA_HASTA_LG,");
        expect(pagina).toContain("max-lg:pb-44");
        expect(pagina).toContain("lg:grid lg:grid-cols-[minmax(0,1fr)_24rem]");
    });

    it("toda tabla desplazable dice que sigue: el borde hacia el que queda tabla se desvanece", () => {
        expect(CLASES_TABLA_DESPLAZABLE).toContain("pista-de-desplazamiento");
        const css = fuente("index.css");
        expect(css).toContain("@utility pista-de-desplazamiento");
        expect(css).toContain("animation-timeline: scroll(self inline)");
    });
});
