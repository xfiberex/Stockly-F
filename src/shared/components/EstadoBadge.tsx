import { Badge } from "@/shared/components/Badge";
import type { Estado } from "@/shared/lib/estados";

/**
 * Pinta un descriptor de estado completo (T2-38): texto, color e icono salen del
 * mismo objeto, así que en la interfaz no hay forma de poner uno sin los otros.
 */
export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
    return (
        <Badge variant={estado.variant} Icon={estado.Icon} className={className}>
            {estado.label}
        </Badge>
    );
}
