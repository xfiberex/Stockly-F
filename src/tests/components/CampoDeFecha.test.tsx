import { render, screen } from "@testing-library/react";
import { CampoDeFecha } from "@/shared/components/CampoDeFecha";

/**
 * El campo de fecha existe porque el nativo se pinta distinto en cada navegador. Reportado
 * desde un Android real: los dos filtros de movimientos salían **vacíos y con el indicador
 * descolocado**, sin parecerse al desplegable de al lado.
 *
 * Lo que se blinda aquí son las tres piezas del arreglo. Las tres se rompen en silencio: el
 * campo sigue funcionando y solo se ve mal, que es justo lo que no destapa ninguna prueba
 * de comportamiento.
 */
describe("CampoDeFecha", () => {
    const campo = () => screen.getByLabelText("Desde");

    it("muestra la pista de formato cuando está vacío", () => {
        // `input[type=date]` **ignora `placeholder`**, y en Android un campo sin valor se
        // pinta en blanco: sin esto no hay forma de saber que es una fecha.
        render(<CampoDeFecha label="Desde" value="" onChange={() => {}} />);

        expect(screen.getByText("dd/mm/aaaa")).toBeInTheDocument();
    });

    it("apaga el texto nativo mientras la pista está puesta", () => {
        // Chrome de escritorio dibuja su propio «dd/mm/aaaa» y Android no. Sin apagar el
        // nativo se veían **los dos superpuestos**, que fue el defecto de la primera
        // versión de este componente.
        render(<CampoDeFecha label="Desde" value="" onChange={() => {}} />);

        expect(campo()).toHaveClass("text-transparent");
    });

    it("con valor, ni pista ni texto apagado", () => {
        render(<CampoDeFecha label="Desde" value="2026-06-16" onChange={() => {}} />);

        expect(screen.queryByText("dd/mm/aaaa")).not.toBeInTheDocument();
        expect(campo()).not.toHaveClass("text-transparent");
    });

    it("oculta el adorno nativo y reserva sitio para el icono propio", () => {
        // Mismo motivo que en `Select`: el indicador nativo se alinea distinto según el
        // navegador. `pr-9` es el hueco del icono que pintamos nosotros.
        render(<CampoDeFecha label="Desde" value="" onChange={() => {}} />);

        expect(campo()).toHaveClass("appearance-none", "pr-9", "campo-de-fecha");
    });

    it("mantiene el par de densidades (T2-40)", () => {
        render(<CampoDeFecha label="Desde" value="" onChange={() => {}} />);

        expect(campo()).toHaveClass("min-h-11", "md:min-h-9");
    });

    it("la etiqueta rotula el campo aunque no se le pase `id`", () => {
        render(<CampoDeFecha label="Hasta" value="" onChange={() => {}} />);

        expect(screen.getByLabelText("Hasta")).toHaveAttribute("type", "date");
    });
});
