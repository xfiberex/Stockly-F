import { render, screen } from "@testing-library/react";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Badge } from "@/shared/components/Badge";
import {
    NIVEL_STOCK,
    ACTIVIDAD,
    ESTADO_ORDEN_COMPRA,
    ESTADO_ORDEN_VENTA,
    TIPO_MOVIMIENTO,
    nivelDeStock,
    buscarEstado,
    type Estado,
} from "@/shared/lib/estados";

/**
 * T2-38 — el color no puede ser el único portador del estado (WCAG 1.4.1).
 *
 * La comprobación imita lo que ve alguien con deficiencia de visión cromática, o
 * cualquiera con el filtro de escala de grises activado: se descarta el color y
 * se mira qué queda. Lo que queda de una insignia es su texto y el trazo de su
 * icono, así que el test extrae del SVG los atributos `d` —la geometría real del
 * dibujo, no el nombre del componente— y exige que dos estados del mismo conjunto
 * no coincidan. Comparar los componentes importados no serviría: dos nombres
 * distintos pueden dibujar exactamente el mismo trazo.
 */
function trazo(estado: Estado): string {
    const { container, unmount } = render(<EstadoBadge estado={estado} />);
    const paths = [...container.querySelectorAll("svg path")].map((p) => p.getAttribute("d"));
    unmount();
    return paths.join("|");
}

const CONJUNTOS: [string, Record<string, Estado>][] = [
    ["nivel de stock", NIVEL_STOCK],
    ["actividad", ACTIVIDAD],
    ["orden de compra", ESTADO_ORDEN_COMPRA],
    ["orden de venta", ESTADO_ORDEN_VENTA],
    ["tipo de movimiento", TIPO_MOVIMIENTO],
];

describe("Descriptores de estado (T2-38)", () => {
    it.each(CONJUNTOS)("en escala de grises, los estados de %s siguen siendo distinguibles", (_nombre, conjunto) => {
        const estados = Object.values(conjunto);

        const trazos = estados.map(trazo);
        expect(new Set(trazos).size).toBe(estados.length);

        // Las **claves** deben ser distintas, no los textos: dos estados con la misma clave
        // dirían lo mismo en los dos idiomas (T4-04).
        const claves = estados.map((e) => e.clave);
        expect(new Set(claves).size).toBe(estados.length);
    });

    it.each(CONJUNTOS)("ningún estado de %s se queda sin icono", (_nombre, conjunto) => {
        for (const [clave, estado] of Object.entries(conjunto)) {
            expect(estado.Icon, `«${clave}» no tiene icono`).toBeTruthy();
            expect(trazo(estado)).not.toBe("");
        }
    });

    // El caso peligroso de verdad: dos estados que comparten color. Si además
    // comparten icono, son indistinguibles incluso viendo el color.
    it("dos estados del mismo color nunca comparten icono", () => {
        for (const [nombre, conjunto] of CONJUNTOS) {
            const porVariante = new Map<string, string[]>();
            for (const estado of Object.values(conjunto)) {
                const lista = porVariante.get(estado.variant) ?? [];
                lista.push(trazo(estado));
                porVariante.set(estado.variant, lista);
            }
            for (const [variante, trazos] of porVariante) {
                expect(new Set(trazos).size, `${nombre} / ${variante}`).toBe(trazos.length);
            }
        }
    });

    // La tabla de productos pinta a la vez el nivel de stock y la actividad; si un
    // icono se repitiera entre los dos conjuntos, la fila diría dos cosas con el
    // mismo dibujo.
    it("el nivel de stock y la actividad no se pisan en la tabla de productos", () => {
        const trazos = [...Object.values(NIVEL_STOCK), ...Object.values(ACTIVIDAD)]
            .filter((e) => e.clave !== "estado.stock.correcto") // «correcto» no se pinta: no es una incidencia
            .map(trazo);
        expect(new Set(trazos).size).toBe(trazos.length);
    });
});

describe("nivelDeStock", () => {
    it.each([
        [0, 0, "agotado"],
        [0, 10, "agotado"],
        [3, 10, "bajo"],
        [10, 10, "bajo"],
        [11, 10, "correcto"],
        [5, 0, "correcto"],
        [5, null, "correcto"],
    ])("stock %i con mínimo %s → %s", (stock, minStock, esperado) => {
        expect(nivelDeStock(stock, minStock)).toBe(esperado);
    });

    it("agotado gana a bajo: cero no es el extremo de «bajo», es otro estado", () => {
        expect(nivelDeStock(0, 10)).toBe("agotado");
        expect(NIVEL_STOCK.agotado.variant).not.toBe(NIVEL_STOCK.bajo.variant);
    });
});

describe("buscarEstado", () => {
    it("devuelve el descriptor cuando el estado se conoce", () => {
        expect(buscarEstado(ESTADO_ORDEN_COMPRA, "RECEIVED").clave).toBe("estado.compra.RECEIVED");
    });

    it("un estado desconocido no hereda el color de otro: sale en neutro y con su código", () => {
        const estado = buscarEstado(ESTADO_ORDEN_COMPRA, "PARTIALLY_RECEIVED");
        // El código viaja como clave y `traducir()` devuelve la clave cuando no la conoce,
        // así que en pantalla sigue saliendo el código en crudo.
        expect(estado.clave).toBe("PARTIALLY_RECEIVED");

        // Y se comprueba de verdad que eso es lo que se ve, no solo lo que se guarda.
        render(<EstadoBadge estado={estado} />);
        expect(screen.getByText("PARTIALLY_RECEIVED")).toBeInTheDocument();
        expect(estado.variant).toBe("neutral");
        expect(estado.Icon).toBeTruthy();
    });
});

describe("Badge con icono", () => {
    it("pinta el icono junto al texto", () => {
        render(<EstadoBadge estado={NIVEL_STOCK.agotado} />);
        expect(screen.getByText("Agotado")).toBeInTheDocument();
        expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
    });

    it("el icono es decorativo: el texto ya dice el estado y no debe oírse dos veces", () => {
        render(<EstadoBadge estado={NIVEL_STOCK.bajo} />);
        expect(screen.getByTestId("badge-icon")).toHaveAttribute("aria-hidden", "true");
    });

    it("sin icono, la insignia sigue siendo la de antes", () => {
        render(<Badge variant="neutral">Categoría</Badge>);
        expect(screen.queryByTestId("badge-icon")).not.toBeInTheDocument();
    });
});
