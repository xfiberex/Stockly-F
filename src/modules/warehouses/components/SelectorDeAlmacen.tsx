import { Select } from "@/shared/components/Select";
import { useT } from "@/shared/hooks/useIdioma";
import { useAlmacenes } from "@/modules/warehouses/hooks/useWarehouses";

interface Props {
    value: string;
    onChange: (warehouseId: string) => void;
    /** El rótulo del campo. Por defecto, «Almacén». */
    label?: string;
    /**
     * Para un filtro de listado: añade «Todos los almacenes» (valor vacío) y ofrece también los
     * desactivados, cuya historia se sigue pudiendo consultar. En un formulario no: ahí se elige
     * dónde va a pasar algo, y solo puede pasar en uno activo.
     */
    comoFiltro?: boolean;
    /** Almacenes que no se ofrecen: el origen, al elegir el destino de una transferencia. */
    excluir?: string;
    disabled?: boolean;
    className?: string;
    /**
     * El rotulo no se pinta y pasa a ser el nombre accesible: para una fila de filtros donde
     * ningun otro desplegable lleva etiqueta visible.
     */
    etiquetaOculta?: boolean;
}

/**
 * T5-14 — elegir un almacén. **Con un solo almacén activo no pinta nada**: no hay elección
 * que hacer, y un desplegable con una opción solo añade ruido a quien no tiene sucursales.
 */
export function SelectorDeAlmacen({ value, onChange, label, comoFiltro = false, excluir, disabled, className, etiquetaOculta = false }: Props) {
    const { t } = useT();
    const { almacenes, activos, hayVarios } = useAlmacenes();

    // Un filtro tambien tiene sentido con un solo almacen activo si hay otro desactivado con historia.
    if (comoFiltro ? almacenes.length < 2 : !hayVarios) return null;

    const ofrecidos = (comoFiltro ? almacenes : activos).filter((a) => a.id !== excluir);
    const opciones = ofrecidos.map((a) => ({
        value: a.id,
        label: a.isActive ? a.name : t("almacenes.nombreInactivo", { nombre: a.name }),
    }));

    const rotulo = label ?? t("almacenes.almacen");

    return (
        <Select
            label={etiquetaOculta ? undefined : rotulo}
            aria-label={etiquetaOculta ? rotulo : undefined}
            value={value}
            disabled={disabled}
            className={className}
            onChange={(e) => onChange(e.target.value)}
            options={comoFiltro ? [{ value: "", label: t("almacenes.todos") }, ...opciones] : opciones}
        />
    );
}
