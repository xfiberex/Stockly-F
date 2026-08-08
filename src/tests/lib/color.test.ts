import { luminanciaRelativa, ratioContraste, textoLegibleSobre } from "@/shared/lib/color";

describe("contraste de color (T2-17)", () => {
    it("calcula la luminancia de los extremos", () => {
        expect(luminanciaRelativa("#000000")).toBe(0);
        expect(luminanciaRelativa("#ffffff")).toBeCloseTo(1, 5);
    });

    it("acepta la forma corta de tres dígitos", () => {
        expect(luminanciaRelativa("#fff")).toBeCloseTo(luminanciaRelativa("#ffffff"), 5);
    });

    it("trata un valor inválido como negro en lugar de romper", () => {
        expect(luminanciaRelativa("no-es-un-color")).toBe(0);
    });

    it("el ratio entre negro y blanco es 21", () => {
        expect(ratioContraste("#000000", "#ffffff")).toBeCloseTo(21, 1);
    });

    it("elige texto oscuro sobre fondos claros y claro sobre fondos oscuros", () => {
        expect(textoLegibleSobre("#fde047")).toBe("#000000"); // amarillo
        expect(textoLegibleSobre("#1e3a8a")).toBe("#ffffff"); // azul oscuro
    });

    // El criterio de aceptación de T2-17: ningún color de etiqueta puede quedar por
    // debajo del mínimo de la WCAG para texto normal.
    it("cualquier color alcanza un contraste ≥ 4.5 con el texto elegido", () => {
        const colores = [
            "#ef4444", "#f97316", "#fde047", "#22c55e", "#06b6d4",
            "#6366f1", "#a855f7", "#ec4899", "#000000", "#ffffff",
            "#767676", "#808080", "#8a8a8a", // la zona intermedia, que es el peor caso
        ];

        for (const color of colores) {
            expect(ratioContraste(color, textoLegibleSobre(color))).toBeGreaterThanOrEqual(4.5);
        }
    });

    it("el peor caso posible sigue por encima de 4.5", () => {
        // Barrido de los 256 grises: si alguno bajara del mínimo, se vería aquí.
        const peor = Math.min(
            ...Array.from({ length: 256 }, (_, i) => {
                const hex = `#${i.toString(16).padStart(2, "0").repeat(3)}`;
                return ratioContraste(hex, textoLegibleSobre(hex));
            }),
        );

        expect(peor).toBeGreaterThanOrEqual(4.5);
    });
});
