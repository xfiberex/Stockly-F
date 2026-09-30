import { useAuth } from "@/modules/auth/hooks/useMe";
import { puede, type RutaConPermiso } from "@/shared/contratos";

/**
 * T5-13 — si la sesión actual puede llamar a una ruta de la API.
 *
 * Lee la matriz `PERMISOS` del contrato, la misma con la que el backend protege cada ruta: un
 * botón se enseña si su ruta lo admite, y no porque alguien haya escrito `role === "ADMIN"` al
 * lado. Con dos roles esa comparación bastaba; con tres, «no es ADMIN» ya no dice qué puede
 * hacer quien mira la pantalla.
 */
export function usePuede(): (ruta: RutaConPermiso) => boolean {
    const { user } = useAuth();
    return (ruta) => puede(user?.role, ruta);
}
