import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectorDeTema } from "@/modules/settings/components/SelectorDeTema";
import { ATRIBUTO_DE_TEMA, CLAVE_DE_TEMA } from "@/shared/lib/tema";

// Sin `renderWithProviders`: el selector no consulta a la API ni navega, así que envolverlo
// en el router y en react-query solo escondería una dependencia si algún día la adquiriese.

const raiz = () => document.documentElement;

function limpiar() {
    delete raiz().dataset[ATRIBUTO_DE_TEMA];
    window.localStorage.clear();
}

describe("SelectorDeTema (T4-11)", () => {
    beforeEach(limpiar);
    afterEach(limpiar);

    it("ofrece los tres temas y arranca en automático", () => {
        render(<SelectorDeTema />);

        expect(screen.getAllByRole("radio")).toHaveLength(3);
        expect(screen.getByRole("radio", { name: /autom/i })).toBeChecked();
    });

    it("elegir un tema lo aplica al instante, sin pasar por Guardar", () => {
        // Es la diferencia con los ajustes de la aplicación, que sí se confirman: aquí no
        // hay botón, y por eso lo que se comprueba es que el atributo ya esté puesto.
        render(<SelectorDeTema />);

        screen.getByRole("radio", { name: /oscuro/i }).click();

        expect(raiz().dataset[ATRIBUTO_DE_TEMA]).toBe("oscuro");
        expect(window.localStorage.getItem(CLAVE_DE_TEMA)).toBe("oscuro");
        expect(screen.getByRole("radio", { name: /oscuro/i })).toBeChecked();
    });

    it("volver a automático borra la elección y devuelve el control al sistema", () => {
        window.localStorage.setItem(CLAVE_DE_TEMA, "claro");
        render(<SelectorDeTema />);

        expect(screen.getByRole("radio", { name: /claro/i })).toBeChecked();

        screen.getByRole("radio", { name: /autom/i }).click();

        expect(raiz().hasAttribute("data-tema")).toBe(false);
        expect(window.localStorage.getItem(CLAVE_DE_TEMA)).toBe("auto");
    });

    it("refleja lo que ya había guardado al montarse", () => {
        // El script en línea de `index.html` ya habrá puesto el atributo; lo que se exige
        // aquí es que el control no contradiga a la página que se está viendo.
        window.localStorage.setItem(CLAVE_DE_TEMA, "oscuro");
        render(<SelectorDeTema />);

        expect(screen.getByRole("radio", { name: /oscuro/i })).toBeChecked();
        expect(screen.getByRole("radio", { name: /autom/i })).not.toBeChecked();
    });

    it("es un grupo de radio de verdad: se recorre con las flechas", async () => {
        // La razón de no usar botones con `aria-pressed`. Si esto deja de pasar es que
        // alguien cambió los `input type=radio` por otra cosa y se llevó por delante la
        // navegación de teclado y el «2 de 3» del lector de pantalla.
        const user = userEvent.setup();
        render(<SelectorDeTema />);

        const [automatico, claro] = screen.getAllByRole("radio");

        await user.tab();
        expect(automatico).toHaveFocus();

        await user.keyboard("{ArrowRight}");
        expect(claro).toHaveFocus();
        expect(claro).toBeChecked();
        expect(window.localStorage.getItem(CLAVE_DE_TEMA)).toBe("claro");
    });

    it("cada opción cuenta como diana táctil (T2-40)", () => {
        const { container } = render(<SelectorDeTema />);

        for (const etiqueta of container.querySelectorAll("label")) {
            expect(etiqueta.className).toContain("min-h-11");
        }
    });
});
