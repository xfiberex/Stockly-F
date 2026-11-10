import { ArchiveBoxIcon, BanknotesIcon, ClockIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";
import type { Clave } from "@/shared/i18n/traducir";
import type { UserRole } from "@/modules/users/types/users.types";

/**
 * T5-13 — un rótulo y un icono por rol, en un mapa literal: el compilador exige una entrada por
 * cada valor del enum, así que un cuarto rol no se pinta con el rótulo de otro. Solo ADMIN va
 * destacado: es el que puede cambiar precios, usuarios y configuración.
 */
export const ROL: Record<UserRole, { clave: Clave; Icono: typeof UserIcon; variante: "info" | "neutral" | "warning" }> = {
    ADMIN: { clave: "usuarios.rol.ADMIN", Icono: ShieldCheckIcon, variante: "info" },
    USER: { clave: "usuarios.rol.USER", Icono: UserIcon, variante: "neutral" },
    WAREHOUSE: { clave: "usuarios.rol.WAREHOUSE", Icono: ArchiveBoxIcon, variante: "neutral" },
    // T6-08 — quien atiende el mostrador.
    SELLER: { clave: "usuarios.rol.SELLER", Icono: BanknotesIcon, variante: "neutral" },
    // AUD-001 — se registró por su cuenta y espera rol: es lo que hay que atender.
    PENDING: { clave: "usuarios.rol.PENDING", Icono: ClockIcon, variante: "warning" },
};
