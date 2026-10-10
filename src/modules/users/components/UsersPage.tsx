import { useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useMe";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { Spinner } from "@/shared/components/Spinner";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useUsers, useInviteUser, useUpdateUserRole, useSetUserActive } from "@/modules/users/hooks/useUsers";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { InvitarUsuarioModal } from "@/modules/users/components/InvitarUsuarioModal";
import type { AppUser, UserRole } from "@/modules/users/types/users.types";
import { MagnifyingGlassIcon, ShieldCheckIcon, UserIcon, EnvelopeIcon, ArchiveBoxIcon, BanknotesIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import type { Clave } from "@/shared/i18n/traducir";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { ACTIVIDAD } from "@/shared/lib/estados";
import { useT } from "@/shared/hooks/useIdioma";
import { formatearFecha } from "@/shared/lib/fechas";
import { CLASES_CONTENEDOR_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";

/**
 * T5-13 — un rótulo y un icono por rol, en un mapa literal: el compilador exige una entrada por
 * cada valor del enum, así que un cuarto rol no se pinta con el rótulo de otro. Solo ADMIN va
 * destacado: es el que puede cambiar precios, usuarios y configuración.
 */
const ROL: Record<UserRole, { clave: Clave; Icono: typeof UserIcon; variante: "info" | "neutral" }> = {
    ADMIN: { clave: "usuarios.rol.ADMIN", Icono: ShieldCheckIcon, variante: "info" },
    USER: { clave: "usuarios.rol.USER", Icono: UserIcon, variante: "neutral" },
    WAREHOUSE: { clave: "usuarios.rol.WAREHOUSE", Icono: ArchiveBoxIcon, variante: "neutral" },
    // T6-08 — quien atiende el mostrador.
    SELLER: { clave: "usuarios.rol.SELLER", Icono: BanknotesIcon, variante: "neutral" },
};

export default function UsersPage() {
    const { t, tn, idioma } = useT();
    const { user: currentUser } = useAuth();

    // Las listas se arman dentro del componente (T4-04): fuera se construirían al cargar
    // el módulo, con el idioma que hubiera entonces, y no cambiarían al elegir otro.
    const ROLES = (Object.keys(ROL) as UserRole[]).map((rol) => ({ value: rol, label: t(ROL[rol].clave) }));
    const ROLE_OPTIONS = [{ value: "", label: t("usuarios.todosLosRoles") }, ...ROLES];

    const STATUS_OPTIONS = [
        { value: "", label: t("comun.todos") },
        { value: "true", label: t("usuarios.activos") },
        { value: "false", label: t("usuarios.inactivos") },
    ];
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("");
    const [activeFilter, setActiveFilter] = useState<string>("");
    const [page, setPage] = useState(1);

    const debouncedSearch = useDebounce(search, 400);

    const { data, isLoading } = useUsers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        role: roleFilter as UserRole || undefined,
        isActive: activeFilter === "" ? undefined : activeFilter === "true",
    });

    const roleMutation = useUpdateUserRole();
    // T6-10
    const puedeInvitar = usePuede()("POST /users");
    const inviteMutation = useInviteUser();
    const [invitando, setInvitando] = useState(false);
    const activeMutation = useSetUserActive();

    const users = data?.data ?? [];
    const meta = data?.meta;

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("usuarios.titulo")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{tn("usuarios.registrados", meta?.total ?? 0)}</p>
                </div>
                {puedeInvitar && (
                    <Button onClick={() => setInvitando(true)}>
                        <UserPlusIcon className="h-4 w-4" />
                        {t("usuarios.invitar")}
                    </Button>
                )}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="relative flex-1 min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                    <input
                        type="text"
                        placeholder={t("usuarios.buscar")}
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full min-h-11 rounded-lg border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition md:min-h-9"
                    />
                </div>
                <div className="flex-1 min-w-36">
                    <Select
                        aria-label={t("usuarios.todosLosRoles")}
                        options={ROLE_OPTIONS}
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="flex-1 min-w-36">
                    <Select
                        aria-label={t("usuarios.filtrarPorEstado")}
                        options={STATUS_OPTIONS}
                        value={activeFilter}
                        onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : users.length === 0 ? (
                <div className="py-16 text-center text-sm text-foreground-muted">{t("usuarios.sinResultados")}</div>
            ) : (
                <div className="bg-surface rounded-xl border border-border overflow-hidden">
                    <div className={CLASES_TABLA_DESPLAZABLE}>
                        <table className={CLASES_TABLA}>
                            <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                                <tr>
                                    <th className="px-6 py-3">{t("usuarios.columna.usuario")}</th>
                                    <th className="px-6 py-3">{t("usuarios.columna.rol")}</th>
                                    <th className="px-6 py-3">{t("comun.estado")}</th>
                                    <th className="px-6 py-3">{t("usuarios.columna.registrado")}</th>
                                    <th className="px-6 py-3 text-right">{t("comun.acciones")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((u: AppUser) => {
                                    const isSelf = u.id === currentUser?.id;
                                    return (
                                        <tr key={u.id} className="hover:bg-surface-muted">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-info-surface flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-semibold text-info">
                                                            {u.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-foreground">{u.name}{isSelf && <span className="ml-1.5 text-xs text-foreground-muted">{t("usuarios.tu")}</span>}</p>
                                                        <p className="text-xs text-foreground-muted">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <Badge variant={ROL[u.role].variante} Icon={ROL[u.role].Icono}>
                                                    {t(ROL[u.role].clave)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-3">
                                                <EstadoBadge estado={u.isActive ? ACTIVIDAD.activo : ACTIVIDAD.inactivo} />
                                                {!u.isVerified && (
                                                    <Badge variant="warning" Icon={EnvelopeIcon} className="ml-1.5">{t("usuarios.sinVerificar")}</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-foreground-muted">{formatearFecha(idioma, u.createdAt)}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Select
                                                        // Nombra la fila, como los botones de solo icono: sin esto un
                                                        // lector de pantalla anuncia tres desplegables llamados «Admin»
                                                        // y no dice de quién es el rol que se está cambiando.
                                                        aria-label={t("usuarios.cambiarRolDe", { nombre: u.name })}
                                                        options={ROLES}
                                                        value={u.role}
                                                        disabled={isSelf || roleMutation.isPending}
                                                        onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value as UserRole })}
                                                        className="text-xs py-1 h-auto"
                                                    />
                                                    <Button
                                                        variant={u.isActive ? "danger" : "secondary"}
                                                        disabled={isSelf || activeMutation.isPending}
                                                        onClick={() => activeMutation.mutate({ id: u.id, active: !u.isActive })}
                                                        className="text-xs px-2.5 py-1 h-auto"
                                                    >
                                                        {t(u.isActive ? "usuarios.desactivar" : "usuarios.activar")}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-foreground-muted">
                    <span>{t("comun.paginaDeTotal", { pagina: page, total: meta.totalPages })}</span>
                    <div className="flex gap-2">
                        <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{t("comun.anterior")}</Button>
                        <Button variant="secondary" disabled={page === meta.totalPages} onClick={() => setPage((p) => p + 1)}>{t("comun.siguiente")}</Button>
                    </div>
                </div>
            )}

            {/* Se monta al abrir: cada invitación empieza con el formulario limpio. */}
            {invitando && (
                <InvitarUsuarioModal
                    isOpen
                    onClose={() => setInvitando(false)}
                    roles={ROLES}
                    isPending={inviteMutation.isPending}
                    onSubmit={(form) => inviteMutation.mutate(form, { onSuccess: () => setInvitando(false) })}
                />
            )}
        </div>
    );
}
