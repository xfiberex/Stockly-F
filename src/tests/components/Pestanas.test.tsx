import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pestanas } from "@/shared/components/Pestanas";
import { propsDePanel } from "@/shared/lib/pestanas";

// AUD-018 — las pestañas de Movimientos eran tres botones sueltos: cuál estaba activa solo se
// veía. Se comprueba el patrón de la WAI-ARIA entero, que es lo que hace que se puedan usar
// sin verlas: roles, estado, una sola parada de tabulador y las flechas.

type Valor = "uno" | "dos" | "tres";

function Prueba() {
    const [activa, setActiva] = useState<Valor>("uno");
    return (
        <>
            <button type="button">Antes</button>
            <Pestanas
                base="p"
                etiqueta="Historial"
                activa={activa}
                onCambio={setActiva}
                pestanas={[
                    { valor: "uno", etiqueta: "Uno" },
                    { valor: "dos", etiqueta: "Dos" },
                    { valor: "tres", etiqueta: "Tres" },
                ]}
            />
            <div {...propsDePanel("p", activa)}>Contenido de {activa}</div>
        </>
    );
}

describe("Pestanas (AUD-018)", () => {
    it("es un tablist con nombre, y cada pestaña dice si está elegida y qué panel controla", () => {
        render(<Prueba />);

        expect(screen.getByRole("tablist", { name: "Historial" })).toBeInTheDocument();
        const uno = screen.getByRole("tab", { name: "Uno" });
        expect(uno).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: "Dos" })).toHaveAttribute("aria-selected", "false");

        const panel = screen.getByRole("tabpanel", { name: "Uno" });
        expect(uno).toHaveAttribute("aria-controls", panel.id);
    });

    it("entra con un solo tabulador, en la pestaña elegida, y el siguiente va al panel", async () => {
        const user = userEvent.setup();
        render(<Prueba />);

        screen.getByRole("button", { name: "Antes" }).focus();
        await user.tab();
        expect(screen.getByRole("tab", { name: "Uno" })).toHaveFocus();

        // No pasa por «Dos» ni por «Tres»: las demás pestañas se alcanzan con las flechas.
        await user.tab();
        expect(screen.getByRole("tabpanel")).toHaveFocus();
    });

    it("las flechas mueven y eligen, dando la vuelta; Inicio y Fin van a los extremos", async () => {
        const user = userEvent.setup();
        render(<Prueba />);
        screen.getByRole("tab", { name: "Uno" }).focus();

        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Dos" })).toHaveFocus();
        expect(screen.getByRole("tab", { name: "Dos" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByText("Contenido de dos")).toBeInTheDocument();

        await user.keyboard("{End}");
        expect(screen.getByRole("tab", { name: "Tres" })).toHaveFocus();

        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Uno" })).toHaveFocus();

        await user.keyboard("{ArrowLeft}");
        expect(screen.getByRole("tab", { name: "Tres" })).toHaveFocus();

        await user.keyboard("{Home}");
        expect(screen.getByRole("tab", { name: "Uno" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: "Tres" })).toHaveAttribute("tabindex", "-1");
    });
});
