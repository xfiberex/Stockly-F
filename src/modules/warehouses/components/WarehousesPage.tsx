import { useState, type FormEvent } from "react";
import { BuildingStorefrontIcon, PlusIcon, StarIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { Input } from "@/shared/components/Input";
import { Modal } from "@/shared/components/Modal";
import { Spinner } from "@/shared/components/Spinner";
import { useT } from "@/shared/hooks/useIdioma";
import { ACTIVIDAD } from "@/shared/lib/estados";
import { formatearImporte } from "@/shared/lib/moneda";
import { CLASES_ACCIONES_DE_ENCABEZADO, CLASES_CONTENEDOR_DE_PAGINA, CLASES_ENCABEZADO_DE_PAGINA } from "@/shared/lib/clasesDeEncabezado";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import {
    useAlmacenesConCifras,
    useCreateWarehouse,
    useSetDefaultWarehouse,
    useSetWarehouseActive,
    useUpdateWarehouse,
} from "@/modules/warehouses/hooks/useWarehouses";
import type { WarehouseWithFigures } from "@/modules/warehouses/types/warehouses.types";

/** Alta y edición comparten formulario: un nombre y, si se quiere, una dirección. */
function FormularioDeAlmacen({ almacen, onClose }: { almacen: WarehouseWithFigures | null; onClose: () => void }) {
    const { t } = useT();
    const crear = useCreateWarehouse();
    const editar = useUpdateWarehouse();
    const [name, setName] = useState(almacen?.name ?? "");
    const [address, setAddress] = useState(almacen?.address ?? "");
    const enviando = crear.isPending || editar.isPending;

    const enviar = (e: FormEvent) => {
        e.preventDefault();
        const form = { name: name.trim(), address: address.trim() };
        if (almacen) editar.mutate({ id: almacen.id, form }, { onSuccess: onClose });
        else crear.mutate(form, { onSuccess: onClose });
    };

    return (
        <Modal isOpen onClose={onClose} title={t(almacen ? "almacenes.editar" : "almacenes.nuevo")}>
            <form onSubmit={enviar} className="space-y-4">
                <Input label={t("comun.nombre")} value={name} maxLength={100} required autoFocus onChange={(e) => setName(e.target.value)} />
                <Input label={t("almacenes.direccion")} value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button type="submit" isLoading={enviando} disabled={name.trim() === ""}>{t("comun.guardar")}</Button>
                </div>
            </form>
        </Modal>
    );
}

/**
 * T5-14 — los almacenes del negocio y lo que guarda cada uno.
 *
 * La lista la ve cualquiera: toda operación de stock dice en cuál ocurre. Darlos de alta,
 * renombrarlos, desactivarlos y elegir el predeterminado es de quien configura el negocio, y
 * cada botón sale de la matriz de permisos, no de comparar el rol.
 *
 * Tarjetas y no una tabla: son un puñado, cada una con tres cifras, y así se lee igual en el
 * móvil de quien está en la sucursal.
 */
export default function WarehousesPage() {
    const { t, tn } = useT();
    const puede = usePuede();
    const { data: almacenes = [], isLoading } = useAlmacenesConCifras();
    const hacerPredeterminado = useSetDefaultWarehouse();
    const cambiarEstado = useSetWarehouseActive();
    // `undefined`: cerrado; `null`: alta; un almacén: su edición.
    const [enFormulario, setEnFormulario] = useState<WarehouseWithFigures | null | undefined>(undefined);

    const puedeEditar = puede("PUT /warehouses/:id");
    const puedeElegir = puede("PATCH /warehouses/:id/default");
    const puedeDesactivar = puede("PATCH /warehouses/:id/deactivate");
    const ocupado = hacerPredeterminado.isPending || cambiarEstado.isPending;

    return (
        <div className={CLASES_CONTENEDOR_DE_PAGINA}>
            <div className={CLASES_ENCABEZADO_DE_PAGINA}>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("ruta.almacenes")}</h1>
                    <p className="text-sm text-foreground-muted mt-1">{t("almacenes.subtitulo")}</p>
                </div>
                <div className={CLASES_ACCIONES_DE_ENCABEZADO}>
                    {puede("POST /warehouses") && (
                        <Button onClick={() => setEnFormulario(null)}>
                            <PlusIcon className="h-4 w-4" />
                            {t("almacenes.nuevo")}
                        </Button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {almacenes.map((almacen) => (
                        <li key={almacen.id} className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
                            <div className="flex items-start gap-3">
                                <BuildingStorefrontIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-foreground-muted" />
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-base font-semibold text-foreground break-words">{almacen.name}</h2>
                                    <p className="text-xs text-foreground-muted break-words">{almacen.address ?? t("almacenes.sinDireccion")}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                                {almacen.isDefault && <Badge variant="info" Icon={StarIcon}>{t("almacenes.predeterminado")}</Badge>}
                                <EstadoBadge estado={almacen.isActive ? ACTIVIDAD.activo : ACTIVIDAD.inactivo} />
                            </div>

                            <dl className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <dt className="text-xs text-foreground-muted">{t("almacenes.productos")}</dt>
                                    <dd className="font-semibold tabular-nums text-foreground">{almacen.products}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-foreground-muted">{t("almacenes.unidades")}</dt>
                                    <dd className="font-semibold tabular-nums text-foreground">{almacen.units}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-foreground-muted">{t("almacenes.valorACoste")}</dt>
                                    <dd className="font-semibold tabular-nums text-foreground">{formatearImporte(almacen.costValue)}</dd>
                                </div>
                            </dl>
                            {almacen.unitsWithoutCost > 0 && (
                                <p className="text-xs text-foreground-muted">{tn("almacenes.sinCoste", almacen.unitsWithoutCost)}</p>
                            )}

                            {(puedeEditar || puedeElegir || puedeDesactivar) && (
                                <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                                    {puedeEditar && (
                                        <Button
                                            variant="secondary"
                                            aria-label={t("almacenes.editarEste", { nombre: almacen.name })}
                                            onClick={() => setEnFormulario(almacen)}
                                        >
                                            {t("comun.editar")}
                                        </Button>
                                    )}
                                    {puedeElegir && almacen.isActive && !almacen.isDefault && (
                                        <Button
                                            variant="secondary"
                                            disabled={ocupado}
                                            aria-label={t("almacenes.hacerPredeterminadoEste", { nombre: almacen.name })}
                                            onClick={() => hacerPredeterminado.mutate(almacen.id)}
                                        >
                                            {t("almacenes.hacerPredeterminado")}
                                        </Button>
                                    )}
                                    {puedeDesactivar && !almacen.isDefault && (
                                        <Button
                                            variant={almacen.isActive ? "danger" : "secondary"}
                                            disabled={ocupado}
                                            aria-label={t(almacen.isActive ? "almacenes.desactivarEste" : "almacenes.activarEste", { nombre: almacen.name })}
                                            onClick={() => cambiarEstado.mutate({ id: almacen.id, active: !almacen.isActive })}
                                        >
                                            {t(almacen.isActive ? "almacenes.desactivar" : "almacenes.activar")}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <p className="text-xs text-foreground-muted">{t("almacenes.nota")}</p>

            {/* Se monta al abrir: cada vez empieza con los datos de ese almacén, o limpio. */}
            {enFormulario !== undefined && <FormularioDeAlmacen almacen={enFormulario} onClose={() => setEnFormulario(undefined)} />}
        </div>
    );
}
