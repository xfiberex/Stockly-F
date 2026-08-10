import { screen } from "@testing-library/react";
import { renderWithProviders } from "../utils";
import { Badge } from "@/shared/components/Badge";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { CheckCircleIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

/**
 * T3-08 — que los iconos decorativos no se anuncien.
 *
 * La ficha decía que solo `Select.tsx` marcaba su chevron como decorativo. Eso describe
 * el JSX, no el DOM: **Heroicons v2 ya emite `aria-hidden="true"` en todos sus iconos**,
 * así que el atributo estaba en los 24 sitios aunque no se escribiera en ninguno.
 * Comprobado en `node_modules/@heroicons/react/24/outline/esm/PlusIcon.js`, y comprobado
 * aquí sobre el DOM renderizado, que es lo que de verdad lee un lector de pantalla.
 *
 * Estos tests no añaden el atributo: **fijan la garantía**. Hoy la da la librería, y una
 * garantía que depende de una dependencia externa se pierde en silencio el día que se
 * cambie de juego de iconos o se actualice a una versión que no lo haga.
 *
 * Y comprueban lo que sí puede romperse por descuido: que un botón cuyo único contenido
 * es un icono oculto **no se quede sin nombre accesible**. Ese es el fallo real de esta
 * familia — no un icono que se anuncia de más, sino un botón que no se anuncia de nada.
 */

function svgs(contenedor: HTMLElement): SVGElement[] {
    return Array.from(contenedor.querySelectorAll("svg"));
}

/**
 * `title` cuenta: la especificación de accname lo admite como **último recurso** cuando no
 * hay contenido ni `aria-label`, y así lo calcula Testing Library. Omitirlo aquí daba tres
 * falsos positivos en `ProductTable`, que sí tenía `title` en sus botones de acción.
 */
function sinNombreAccesible(contenedor: HTMLElement): string[] {
    return Array.from(contenedor.querySelectorAll("button"))
        .filter(
            (b) =>
                !(
                    b.textContent?.trim() ||
                    b.getAttribute("aria-label") ||
                    b.getAttribute("aria-labelledby") ||
                    b.getAttribute("title")
                ),
        )
        .map((b) => b.outerHTML.slice(0, 120));
}

describe("Iconos decorativos (T3-08)", () => {
    it("un icono dentro de un Badge no se anuncia", () => {
        const { container } = renderWithProviders(
            <Badge variant="success" Icon={CheckCircleIcon}>
                Activo
            </Badge>,
        );

        const iconos = svgs(container);
        expect(iconos).not.toHaveLength(0);
        for (const icono of iconos) expect(icono).toHaveAttribute("aria-hidden", "true");
        // El texto sigue estando: ocultar el icono no puede llevarse la información.
        expect(screen.getByText("Activo")).toBeInTheDocument();
    });

    it("el chevron del Select tampoco", () => {
        const { container } = renderWithProviders(
            <Select label="Categoría" options={[{ value: "1", label: "Electrónica" }]} />,
        );

        for (const icono of svgs(container)) expect(icono).toHaveAttribute("aria-hidden", "true");
    });

    it("un icono acompañando al texto de un botón no duplica el anuncio", () => {
        const { container } = renderWithProviders(
            <Button>
                <PlusIcon className="h-4 w-4" />
                Nuevo producto
            </Button>,
        );

        for (const icono of svgs(container)) expect(icono).toHaveAttribute("aria-hidden", "true");
        expect(screen.getByRole("button", { name: "Nuevo producto" })).toBeInTheDocument();
    });

    it("un botón de solo icono conserva su nombre accesible", () => {
        // Es el reverso del criterio: con el icono oculto, si nadie pone `aria-label` el
        // botón se anuncia como «botón» a secas y no hay forma de saber qué hace.
        const { container } = renderWithProviders(
            <Button aria-label="Eliminar producto">
                <TrashIcon className="h-4 w-4" />
            </Button>,
        );

        expect(sinNombreAccesible(container)).toEqual([]);
        expect(screen.getByRole("button", { name: "Eliminar producto" })).toBeInTheDocument();
    });

    it("sin `aria-label`, un botón de solo icono se detecta como mudo", () => {
        // Falsificación del test anterior: si la comprobación no distinguiera este caso,
        // no estaría comprobando nada.
        const { container } = renderWithProviders(
            <Button>
                <TrashIcon className="h-4 w-4" />
            </Button>,
        );

        expect(sinNombreAccesible(container)).toHaveLength(1);
    });
});
