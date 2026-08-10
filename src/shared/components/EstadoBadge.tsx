import { Badge } from "@/shared/components/Badge";
import { useT } from "@/shared/hooks/useIdioma";
import type { Estado } from "@/shared/lib/estados";

/**
 * Pinta un descriptor de estado completo (T2-38): texto, color e icono salen del
 * mismo objeto, así que en la interfaz no hay forma de poner uno sin los otros.
 *
 * Es además **el único sitio que traduce un estado** (T4-04). Los descriptores llevan la
 * clave del catálogo, no el texto, porque se construyen al cargar el módulo y el idioma se
 * decide al pintar: una cadena ya traducida se quedaría congelada en el idioma que hubiera
 * al arrancar.
 */
export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
    const { t } = useT();

    return (
        <Badge variant={estado.variant} Icon={estado.Icon} className={className}>
            {t(estado.clave)}
        </Badge>
    );
}
