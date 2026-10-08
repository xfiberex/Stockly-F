import { useId, useState, type KeyboardEvent } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { useCustomers } from "@/modules/customers/hooks/useCustomers";
import type { CustomerListItem } from "@/modules/customers/types/customer.types";

const RESULTADOS = 8;

interface BuscadorDeClienteProps {
    /** El cliente elegido, o `null` si la venta no está vinculada a ninguno. */
    seleccionado: CustomerListItem | null;
    onSeleccionar: (cliente: CustomerListItem | null) => void;
    /**
     * T6-08 — la ayuda de debajo del campo. Por defecto es la del formulario de venta, que
     * promete vincular por el correo; el mostrador no tiene campo de correo y dice otra cosa.
     */
    ayuda?: string;
}

/**
 * T5-06 — elegir el cliente de una venta entre los que ya existen.
 *
 * Es un combobox del patrón de ARIA 1.2: el foco se queda en el campo y la opción activa se
 * señala con `aria-activedescendant`, así que se escribe y se elige con las flechas sin saltar
 * de un sitio a otro. Enter elige sin enviar el formulario; Escape cierra la lista **sin cerrar
 * el diálogo** que la contiene.
 *
 * Elegir no es obligatorio: sin cliente elegido, la venta se vincula sola por su correo.
 */
export function BuscadorDeCliente({ seleccionado, onSeleccionar, ayuda }: BuscadorDeClienteProps) {
    const { t } = useT();
    const id = useId();
    const idLista = `${id}-lista`;
    const idAyuda = `${id}-ayuda`;

    const [texto, setTexto] = useState("");
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const search = useDebounce(texto.trim(), 250);

    const { data, isPlaceholderData } = useCustomers({ search, limit: RESULTADOS }, { enabled: abierto && !seleccionado });
    // Solo se ofrecen resultados **de lo que está escrito**. Mientras llega la búsqueda nueva,
    // la consulta conserva la anterior (`keepPreviousData`), y un Enter rápido elegía la primera
    // opción de una lista que ya no era la de lo tecleado: visto en el E2E del móvil.
    const alDia = texto.trim() === search && !isPlaceholderData && data !== undefined;
    const opciones = alDia ? data.data : [];
    const idOpcion = (i: number) => `${id}-opcion-${i}`;

    const elegir = (cliente: CustomerListItem) => {
        onSeleccionar(cliente);
        setAbierto(false);
        setTexto("");
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!abierto) { setAbierto(true); setActivo(0); return; }
            setActivo((i) => Math.min(i + 1, opciones.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            // Con la lista abierta, Enter elige; sin ella, no hace nada: enviar la venta desde
            // el buscador, a medio escribir, sería una sorpresa.
            e.preventDefault();
            if (abierto && opciones[activo]) elegir(opciones[activo]);
        } else if (e.key === "Escape" && abierto) {
            // El diálogo escucha Escape en `document`: sin esto, cerrar la lista lo cerraría a él.
            e.stopPropagation();
            setAbierto(false);
        }
    };

    if (seleccionado) {
        return (
            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">{t("ventas.clienteVinculado")}</span>
                <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-1.5 md:min-h-9">
                    <span className="min-w-0 truncate text-sm text-foreground">
                        {seleccionado.name}
                        {seleccionado.email && <span className="text-foreground-muted"> · {seleccionado.email}</span>}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 px-2"
                        aria-label={t("ventas.quitarCliente", { nombre: seleccionado.name })}
                        onClick={() => onSeleccionar(null)}
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium text-foreground">{t("ventas.buscarCliente")}</label>
            <input
                id={id}
                type="text"
                role="combobox"
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={abierto}
                aria-controls={idLista}
                aria-describedby={idAyuda}
                aria-activedescendant={abierto && opciones[activo] ? idOpcion(activo) : undefined}
                placeholder={t("ventas.buscarClientePlaceholder")}
                className={cn(
                    "min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none transition md:min-h-9",
                    "focus:border-accent focus:ring-2 focus:ring-accent/20",
                )}
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); }}
                onFocus={() => setAbierto(true)}
                onBlur={() => setAbierto(false)}
                onKeyDown={onKeyDown}
            />
            <p id={idAyuda} className="text-xs text-foreground-muted">{ayuda ?? t("ventas.buscarClienteAyuda")}</p>
            <ul
                id={idLista}
                role="listbox"
                aria-label={t("ventas.clientesEncontrados")}
                hidden={!abierto}
                className="absolute left-0 right-0 top-[4.25rem] z-10 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-overlay"
            >
                {opciones.length === 0 ? (
                    <li role="presentation" className="px-3 py-2 text-sm text-foreground-muted">
                        {alDia ? t("ventas.ningunCliente") : t("ventas.buscandoClientes")}
                    </li>
                ) : (
                    opciones.map((cliente, i) => (
                        <li
                            key={cliente.id}
                            id={idOpcion(i)}
                            role="option"
                            aria-selected={i === activo}
                            // `mousedown` y no `click`: el clic llega después del `blur` del campo,
                            // que ya ha cerrado la lista.
                            onMouseDown={(e) => { e.preventDefault(); elegir(cliente); }}
                            onMouseEnter={() => setActivo(i)}
                            className={cn(
                                "cursor-pointer px-3 py-2 text-sm",
                                i === activo ? "bg-accent/10 text-foreground" : "text-foreground",
                            )}
                        >
                            <span className="font-medium">{cliente.name}</span>
                            {cliente.email && <span className="block text-xs text-foreground-muted">{cliente.email}</span>}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
