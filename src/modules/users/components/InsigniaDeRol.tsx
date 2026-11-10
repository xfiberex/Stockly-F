import { Badge } from "@/shared/components/Badge";
import { useT } from "@/shared/hooks/useIdioma";
import { ROL } from "@/modules/users/rol";
import type { UserRole } from "@/modules/users/types/users.types";

/**
 * AUD-016 — el rol, con el mismo aspecto en Usuarios, en el menú de usuario y en el Perfil.
 * Antes solo se veía en la lista de Usuarios, que es de ADMIN: nadie más sabía con qué rol
 * había entrado ni por qué su menú era distinto del de un compañero.
 */
export function InsigniaDeRol({ rol, className }: { rol: UserRole; className?: string }) {
    const { t } = useT();
    const { clave, Icono, variante } = ROL[rol];
    return (
        <Badge variant={variante} Icon={Icono} className={className}>
            {t(clave)}
        </Badge>
    );
}
