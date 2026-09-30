import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "@/shared/components/Modal";

describe("Modal", () => {
    it("no renderiza nada cuando isOpen=false", () => {
        render(
            <Modal isOpen={false} onClose={vi.fn()} title="Título">
                Contenido
            </Modal>,
        );
        expect(screen.queryByText("Título")).toBeNull();
        expect(screen.queryByText("Contenido")).toBeNull();
    });

    it("renderiza título y contenido cuando isOpen=true", () => {
        render(
            <Modal isOpen onClose={vi.fn()} title="Mi Modal">
                Contenido del modal
            </Modal>,
        );
        expect(screen.getByText("Mi Modal")).toBeInTheDocument();
        expect(screen.getByText("Contenido del modal")).toBeInTheDocument();
    });

    it("llama a onClose al presionar la tecla Escape", () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen onClose={onClose} title="Test">
                Content
            </Modal>,
        );
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("no dispara onClose con Escape cuando isOpen=false", () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen={false} onClose={onClose} title="Test">
                Content
            </Modal>,
        );
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
    });

    it("con un modal encima de otro, Escape cierra solo el de arriba y el scroll sigue bloqueado (T5-08)", () => {
        const cerrarAbajo = vi.fn();
        const cerrarArriba = vi.fn();
        const { rerender } = render(
            <>
                <Modal isOpen onClose={cerrarAbajo} title="Formulario">Abajo</Modal>
                <Modal isOpen onClose={cerrarArriba} title="Escáner">Arriba</Modal>
            </>,
        );

        fireEvent.keyDown(document, { key: "Escape" });
        expect(cerrarArriba).toHaveBeenCalledTimes(1);
        expect(cerrarAbajo).not.toHaveBeenCalled();

        rerender(
            <>
                <Modal isOpen onClose={cerrarAbajo} title="Formulario">Abajo</Modal>
                <Modal isOpen={false} onClose={cerrarArriba} title="Escáner">Arriba</Modal>
            </>,
        );
        expect(document.body.style.overflow).toBe("hidden");

        fireEvent.keyDown(document, { key: "Escape" });
        expect(cerrarAbajo).toHaveBeenCalledTimes(1);
    });

    it("llama a onClose al hacer clic en el overlay semitransparente", () => {
        const onClose = vi.fn();
        render(
            <Modal isOpen onClose={onClose} title="Test">
                Content
            </Modal>,
        );
        const overlay = document.querySelector('[class*="backdrop-blur"]');
        expect(overlay).toBeTruthy();
        fireEvent.click(overlay!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("llama a onClose al hacer clic en el botón X", async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <Modal isOpen onClose={onClose} title="Test">
                Content
            </Modal>,
        );
        await user.click(screen.getByRole("button"));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("renderiza children arbitrarios dentro del modal", () => {
        render(
            <Modal isOpen onClose={vi.fn()} title="Con form">
                <input data-testid="modal-input" />
            </Modal>,
        );
        expect(screen.getByTestId("modal-input")).toBeInTheDocument();
    });
});
