import { readFileSync } from "node:fs";
import path from "node:path";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/tests/utils";
import { ProductTable } from "@/modules/products/components/ProductTable";
import type { Product } from "@/modules/products/types/product.types";

// T2-39 — las cifras de una tabla existen para compararse en vertical.
//
// El efecto tipográfico (que el «1» ocupe lo mismo que el «8») no se puede medir
// en jsdom, que no tiene métricas de fuente: eso se comprobó en el navegador
// midiendo anchos reales. Lo que sí se puede blindar aquí es que las dos piezas
// que lo hacen posible sigan en su sitio — la regla de `index.css` y la caja de
// ancho fijo del stock—, porque son lo que se pierde en un refactor distraído.

const CSS = readFileSync(path.join(process.cwd(), "src/index.css"), "utf8");

function producto(over: Partial<Product>): Product {
    return {
        id: over.id ?? "1",
        name: "Producto",
        description: null,
        sku: null,
        price: "1000.00",
        stock: 5,
        minStock: 0,
        isActive: true,
        imageUrl: null,
        category: null,
        brand: null,
        supplier: null,
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        ...over,
    } as Product;
}

describe("Cifras tabulares (T2-39)", () => {
    it("las tablas piden cifras tabulares desde el CSS, no celda a celda", () => {
        expect(CSS).toMatch(/table\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    });

    it("el stock ocupa una caja de ancho fijo alineada a la derecha", () => {
        // Es lo que alinea las unidades pese a que detrás vengan el icono de
        // incidencia y el mínimo, cuyo ancho sí cambia de fila a fila.
        const productos = [
            producto({ id: "1", stock: 7 }),
            producto({ id: "2", stock: 12345 }),
        ];
        renderWithProviders(<ProductTable products={productos} isLoading={false} onEdit={() => {}} />);

        for (const valor of ["7", "12345"]) {
            const span = screen.getByText(valor);
            expect(span).toHaveClass("inline-block", "min-w-10", "text-right");
        }
    });

    it("la columna de precio está alineada a la derecha, encabezado incluido", () => {
        renderWithProviders(
            <ProductTable products={[producto({ id: "1" })]} isLoading={false} onEdit={() => {}} />,
        );

        expect(screen.getByText("Precio")).toHaveClass("text-right");

        const fila = screen.getByText("Producto").closest("tr")!;
        const celdaPrecio = within(fila).getByText(/^\$1,000\.00$/);
        expect(celdaPrecio).toHaveClass("text-right");
    });
});
