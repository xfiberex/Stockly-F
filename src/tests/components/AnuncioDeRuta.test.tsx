import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route, Link, Outlet, useNavigate } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import { AnuncioDeRuta } from "@/shared/components/AnuncioDeRuta";

/** Retroceso real (`POP`), que un `<Link>` al inicio no produce: eso es un `PUSH` más. */
function BotonAtras() {
    const navegar = useNavigate();
    return <button onClick={() => navegar(-1)}>Atrás</button>;
}

// T2-18: lo que se comprueba no es que exista una región `aria-live` —eso no sirve de
// nada por sí solo—, sino que al navegar cambie su texto y que el foco acabe dentro del
// contenido, que es lo que decide si el siguiente Tab sigue leyendo o vuelve al menú.

/** Un layout mínimo con el mismo `<main>` que deja puesto T2-11. */
function layout() {
    return (
        <Routes>
            <Route
                element={
                    <>
                        <nav>
                            <Link to="/reports">Ir a reportes</Link>
                            <Link to="/">Ir al inicio</Link>
                            <BotonAtras />
                        </nav>
                        <AnuncioDeRuta />
                        <main id="contenido" tabIndex={-1}>
                            <Outlet />
                        </main>
                    </>
                }
            >
                <Route index element={<h1>Panel</h1>} />
                <Route path="reports" element={<h1>Informes</h1>} />
            </Route>
        </Routes>
    );
}

describe("AnuncioDeRuta (T2-18)", () => {
    it("en la primera carga no roba el foco", () => {
        renderWithProviders(layout());

        // Quien acaba de llegar puede estar leyendo desde el principio: moverle el foco
        // al contenido se lo quitaría, y el navegador ya anuncia la página en una carga.
        expect(document.body).toHaveFocus();
    });

    it("al navegar, el foco acaba en `<main>`", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));

        await waitFor(() => expect(document.getElementById("contenido")).toHaveFocus());
    });

    it("la región viva pasa a decir el título de la sección nueva", async () => {
        const user = userEvent.setup();
        const { container } = renderWithProviders(layout());
        const region = container.querySelector("[aria-live='polite']")!;

        expect(region).toHaveTextContent("Dashboard");

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));

        // Es el *cambio* de texto lo que el lector anuncia; por eso se deriva del
        // pathname en vez de guardarse en un estado que alguien tenga que sincronizar.
        await waitFor(() => expect(region).toHaveTextContent("Reportes"));
    });

    it("la región no es visible, pero sí está en el árbol de accesibilidad", () => {
        const { container } = renderWithProviders(layout());
        const region = container.querySelector("[aria-live='polite']")!;

        // `sr-only`, no `hidden`: un `display: none` no se anuncia.
        expect(region).toHaveClass("sr-only");
        expect(region).not.toHaveAttribute("aria-hidden");
    });

    it("el título del documento acompaña a la ruta", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());

        expect(document.title).toBe("Dashboard · Stockly");

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));

        await waitFor(() => expect(document.title).toBe("Reportes · Stockly"));
    });

    it("volver atrás también anuncia y mueve el foco", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());
        const region = document.querySelector("[aria-live='polite']")!;

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));
        await waitFor(() => expect(region).toHaveTextContent("Reportes"));

        await user.click(screen.getByRole("link", { name: "Ir al inicio" }));

        await waitFor(() => expect(region).toHaveTextContent("Dashboard"));
        expect(document.getElementById("contenido")).toHaveFocus();
    });
});

// React Router no restablece el desplazamiento al cambiar de ruta: se conservaba el de
// la página anterior y se aterrizaba a media página, con el `<h1>` por encima del borde
// superior. Había que subir a mano para ver de qué sección se trataba.
describe("AnuncioDeRuta — la página vuelve arriba al navegar", () => {
    let desplazar: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // jsdom no implementa el desplazamiento; lo que se comprueba es la orden, no el efecto.
        desplazar = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    });

    afterEach(() => desplazar.mockRestore());

    it("la primera carga no desplaza nada", () => {
        renderWithProviders(layout());

        // Se puede llegar a una URL con el navegador ya desplazado (recarga, enlace
        // compartido). Solo se corrige lo que rompe la propia navegación de la SPA.
        expect(desplazar).not.toHaveBeenCalled();
    });

    it("al navegar a otra sección, sube al principio del documento", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));

        await waitFor(() => expect(desplazar).toHaveBeenCalledWith(0, 0));
    });

    it("el foco se pide con `preventScroll`, para no pelearse con el desplazamiento", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());
        const contenido = document.getElementById("contenido")!;
        const enfocar = vi.spyOn(contenido, "focus");

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));

        // Sin esto, `focus()` desplaza por su cuenta: `<main>` es más alto que la ventana
        // y el navegador alinea su *final* con el borde inferior en vez de mostrar el título.
        await waitFor(() => expect(enfocar).toHaveBeenCalledWith({ preventScroll: true }));
        enfocar.mockRestore();
    });

    it("al retroceder no sube: se respeta la posición que restaura el navegador", async () => {
        const user = userEvent.setup();
        renderWithProviders(layout());

        await user.click(screen.getByRole("link", { name: "Ir a reportes" }));
        await waitFor(() => expect(desplazar).toHaveBeenCalledTimes(1));

        await user.click(screen.getByRole("button", { name: "Atrás" }));

        // El navegador devuelve la entrada del historial a donde estaba; forzar el
        // principio borraría justo lo que se espera recuperar al volver.
        await waitFor(() => expect(document.title).toBe("Dashboard · Stockly"));
        expect(desplazar).toHaveBeenCalledTimes(1);
    });
});
