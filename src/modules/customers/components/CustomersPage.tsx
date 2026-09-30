import { useState } from "react";
import { Link } from "react-router-dom";
import { MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Modal } from "@/shared/components/Modal";
import { Paginacion } from "@/shared/components/Paginacion";
import { Spinner } from "@/shared/components/Spinner";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { CLASES_BOTON_ICONO } from "@/shared/lib/clasesDeBoton";
import { CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { CLASES_TABLA, CLASES_TABLA_DESPLAZABLE } from "@/shared/lib/clasesDeTabla";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { CustomerFormModal } from "@/modules/customers/components/CustomerFormModal";
import { useCreateCustomer, useCustomers, useDeleteCustomer, useUpdateCustomer } from "@/modules/customers/hooks/useCustomers";
import type { Customer, CustomerForm, CustomerListItem } from "@/modules/customers/types/customer.types";

const PAGE_SIZE = 20;

// ── Confirmación de borrado ───────────────────────────────────────────────────

interface BorrarClienteModalProps {
    cliente: CustomerListItem | null;
    isPending: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/**
 * Borrar un cliente **no borra sus órdenes**: se quedan sin cliente, con el nombre y el correo
 * que tenían. Es lo que se confirma, porque es lo que no se ve desde la tabla.
 */
function BorrarClienteModal({ cliente, isPending, onConfirm, onClose }: BorrarClienteModalProps) {
    const { t, tn } = useT();
    return (
        <Modal isOpen={cliente !== null} onClose={onClose} title={t("clientes.borrar.titulo")}>
            {cliente && (
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-foreground">{t("clientes.borrar.explicacion", { nombre: cliente.name })}</p>
                    {cliente.ordersCount > 0 && (
                        <p className="text-sm text-foreground-muted">{tn("clientes.borrar.ordenes", cliente.ordersCount)}</p>
                    )}
                    <div className="flex justify-end gap-2 border-t border-border pt-3">
                        <Button type="button" variant="secondary" onClick={onClose}>{t("comun.volver")}</Button>
                        <Button type="button" variant="danger" isLoading={isPending} onClick={onConfirm}>{t("comun.eliminar")}</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
    const { t, tn } = useT();
    const puede = usePuede();
    const puedeCrear = puede("POST /customers");
    const puedeEditar = puede("PUT /customers/:id");
    const puedeBorrar = puede("DELETE /customers/:id");

    const [busqueda, setBusqueda] = useState("");
    const [page, setPage] = useState(1);
    const search = useDebounce(busqueda.trim(), 400);

    const { data, isLoading, isFetching } = useCustomers({ page, limit: PAGE_SIZE, search });
    const clientes = data?.data ?? [];

    const createMutation = useCreateCustomer();
    const updateMutation = useUpdateCustomer();
    const deleteMutation = useDeleteCustomer();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Customer | undefined>();
    const [aBorrar, setABorrar] = useState<CustomerListItem | null>(null);
    // Cada «Nuevo» remonta el formulario (ver la `key` del modal), igual que en proveedores: sin
    // eso el siguiente alta se abría con los datos del anterior.
    const [aperturas, setAperturas] = useState(0);

    const abrirNuevo = () => { setEditing(undefined); setAperturas((n) => n + 1); setFormOpen(true); };
    const abrirEdicion = (cliente: Customer) => { setEditing(cliente); setFormOpen(true); };
    const cerrar = () => { setFormOpen(false); setEditing(undefined); };

    const guardar = (form: CustomerForm) => {
        if (editing) updateMutation.mutate({ id: editing.id, form }, { onSuccess: cerrar });
        else createMutation.mutate(form, { onSuccess: cerrar });
    };

    const confirmarBorrado = () => {
        if (!aBorrar) return;
        deleteMutation.mutate(aBorrar.id, { onSuccess: () => setABorrar(null) });
    };

    const acciones = puedeEditar || puedeBorrar;

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.clientes")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{tn("clientes.registrados", data?.meta.total ?? 0)}</p>
                </div>
                {puedeCrear && (
                    <Button onClick={abrirNuevo}>
                        <PlusIcon className="h-4 w-4" />
                        {t("clientes.nuevo")}
                    </Button>
                )}
            </div>

            <div className="relative mb-4 max-w-md">
                <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <Input
                    type="search"
                    aria-label={t("clientes.buscar")}
                    placeholder={t("clientes.buscar")}
                    className="w-full pl-9"
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : clientes.length === 0 ? (
                <div className="py-12 text-center text-sm text-foreground-muted">
                    {search ? t("clientes.sinResultados") : t("clientes.vacio")}
                </div>
            ) : (
                <div className={cn(CLASES_TABLA_DESPLAZABLE, "rounded-xl border border-border", isFetching && "opacity-70")}>
                    <table className={CLASES_TABLA}>
                        <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                            <tr>
                                <th className="px-4 py-3">{t("comun.nombre")}</th>
                                <th className="px-4 py-3">{t("clientes.correo")}</th>
                                <th className="px-4 py-3">{t("clientes.telefono")}</th>
                                <th className="px-4 py-3 text-right">{t("clientes.ordenes")}</th>
                                {acciones && <th className="px-4 py-3 text-right">{t("comun.acciones")}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-surface">
                            {clientes.map((cliente) => (
                                <tr key={cliente.id} className="hover:bg-surface-muted transition-colors">
                                    <td className="px-4 py-3 font-medium">
                                        <Link to={`/customers/${cliente.id}`} className="text-accent hover:underline">{cliente.name}</Link>
                                    </td>
                                    <td className="px-4 py-3 text-foreground-muted">{cliente.email ?? "—"}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">{cliente.phone ?? "—"}</td>
                                    <td className="px-4 py-3 text-right tabular-nums text-foreground-muted">{cliente.ordersCount}</td>
                                    {acciones && (
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                {/* El nombre accesible nombra al cliente: dos botones de
                                                    icono por fila se anunciarían igual en todas. */}
                                                {puedeEditar && (
                                                    <Button
                                                        variant="ghost"
                                                        className={CLASES_BOTON_ICONO}
                                                        title={t("comun.editar")}
                                                        aria-label={t("clientes.editarDe", { nombre: cliente.name })}
                                                        onClick={() => abrirEdicion(cliente)}
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {puedeBorrar && (
                                                    <Button
                                                        variant="ghost"
                                                        className={CLASES_BOTON_ICONO}
                                                        title={t("comun.eliminar")}
                                                        aria-label={t("clientes.eliminarDe", { nombre: cliente.name })}
                                                        onClick={() => setABorrar(cliente)}
                                                    >
                                                        <TrashIcon className="h-4 w-4 text-danger" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <Paginacion page={page} totalPages={data?.meta.totalPages ?? 1} onPage={setPage} />
                </div>
            )}

            <CustomerFormModal
                key={editing?.id ?? `nuevo-${aperturas}`}
                isOpen={formOpen}
                onClose={cerrar}
                customer={editing}
                onSubmit={guardar}
                isPending={createMutation.isPending || updateMutation.isPending}
            />
            <BorrarClienteModal
                cliente={aBorrar}
                isPending={deleteMutation.isPending}
                onConfirm={confirmarBorrado}
                onClose={() => setABorrar(null)}
            />
        </div>
    );
}
