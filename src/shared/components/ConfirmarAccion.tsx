import type { ReactNode } from "react";
import { Button } from "@/shared/components/Button";
import { Modal } from "@/shared/components/Modal";
import { useT } from "@/shared/hooks/useIdioma";

/**
 * AUD-012 — la confirmación de una acción que no se deshace con otro toque: borrar, cancelar,
 * enviar, cambiar un rol, desactivar. Sigue el modelo de las que ya confirmaban (borrar un
 * cliente, cancelar una venta enviada): **el título nombra la acción y la cosa**, y el cuerpo
 * dice la consecuencia que no se ve desde la fila —qué stock se mueve, qué se pierde, qué deja
 * de poder hacer alguien—. «Volver» va primero en el teclado y a la izquierda.
 *
 * Abierto mientras haya algo que confirmar (`abierto`); quien lo usa lo cierra en el
 * `onSuccess` de la mutación, para que un fallo deje el diálogo con su aviso delante.
 */
export function ConfirmarAccion({
    abierto,
    titulo,
    children,
    confirmar,
    peligro = true,
    pendiente = false,
    onConfirmar,
    onCerrar,
}: {
    abierto: boolean;
    titulo: string;
    children: ReactNode;
    /** El rótulo del botón: el verbo de la acción («Eliminar», «Marcar enviada»), no «Aceptar». */
    confirmar: string;
    /** Rojo para lo que destruye o quita; el primario para lo que avanza (enviar, hacer predeterminado). */
    peligro?: boolean;
    pendiente?: boolean;
    onConfirmar: () => void;
    onCerrar: () => void;
}) {
    const { t } = useT();
    return (
        <Modal isOpen={abierto} onClose={onCerrar} title={titulo} className="max-w-md">
            <div className="flex flex-col gap-4 text-sm text-foreground">
                {children}
                <div className="flex justify-end gap-2 border-t border-border pt-3">
                    <Button type="button" variant="secondary" onClick={onCerrar}>{t("comun.volver")}</Button>
                    <Button type="button" variant={peligro ? "danger" : "primary"} isLoading={pendiente} onClick={onConfirmar}>
                        {confirmar}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
