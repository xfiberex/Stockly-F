import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useT } from "@/shared/hooks/useIdioma";
import { cn } from "@/shared/lib/cn";
import { useProducts } from "@/modules/products/hooks/useProducts";
import type { ProductWithAvailability } from "@/modules/products/types/product.types";

const RESULTADOS = 8;

interface BuscadorDeProductoProps {
    /** El producto del catálogo ligado a la línea, o `null` si el ítem va escrito a mano. */
    seleccionado: ProductWithAvailability | null;
    onSeleccionar: (producto: ProductWithAvailability | null) => void;
}

/**
 * T6-02 — elegir el producto de una línea de venta o de compra buscándolo en el servidor.
 *
 * Sustituye a un desplegable que se llenaba con una página del catálogo: el servidor no da más
 * de cien y los ordena por fecha de alta, así que un producto más antiguo no se podía elegir, y
 * escrito a mano no movía stock. Aquí cada tecla es una consulta, y solo de productos activos.
 *
 * Es el mismo combobox de ARIA 1.2 que `BuscadorDeCliente`: el foco se queda en el campo, la
 * opción activa va en `aria-activedescendant`, Enter elige sin enviar el formulario y Escape
 * cierra la lista sin cerrar el diálogo.
 */
export function BuscadorDeProducto({ seleccionado, onSeleccionar }: BuscadorDeProductoProps) {
    const { t } = useT();
    const id = useId();
    const idLista = `${id}-lista`;

    const [texto, setTexto] = useState("");
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const search = useDebounce(texto.trim(), 250);

    const { data, isFetching } = useProducts(
        { search: search || undefined, isActive: true, limit: RESULTADOS },
        { enabled: abierto && !seleccionado },
    );
    // Solo se ofrecen resultados **de lo que está escrito** y **recién traídos**: de la opción
    // elegida sale el disponible con el que el formulario de venta valida la cantidad, y el de
    // la caché puede ser el de antes de la última venta.
    const alDia = texto.trim() === search && !isFetching && data !== undefined;
    const opciones = alDia ? data.data : [];
    const idOpcion = (i: number) => `${id}-opcion-${i}`;

    // La lista cuelga del campo dentro de un diálogo con scroll propio: en la última línea de
    // una orden quedaba cortada por el borde, con una sola opción a la vista. Al abrirse y al
    // llegar resultados se trae entera, y después la opción activa, que con las flechas puede
    // quedar por debajo del alto máximo de la lista.
    const lista = useRef<HTMLUListElement>(null);
    const cuantas = opciones.length;
    useEffect(() => {
        if (!abierto) return;
        lista.current?.scrollIntoView?.({ block: "nearest" });
        lista.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
    }, [abierto, cuantas, activo]);

    const elegir = (producto: ProductWithAvailability) => {
        onSeleccionar(producto);
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
            // Con la lista abierta, Enter elige; sin ella, no hace nada: enviar la orden desde
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
                <span className="text-sm font-medium text-foreground">{t("ordenes.producto")}</span>
                <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/5 px-3 py-1.5 md:min-h-9">
                    <span className="min-w-0 truncate text-sm text-foreground">{seleccionado.name}</span>
                    <Button
                        type="button"
                        variant="ghost"
                        className="shrink-0 px-2"
                        aria-label={t("ordenes.quitarProducto", { nombre: seleccionado.name })}
                        onClick={() => onSeleccionar(null)}
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium text-foreground">{t("ordenes.producto")}</label>
            <div className="relative flex flex-col">
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={abierto}
                    aria-controls={idLista}
                    aria-activedescendant={abierto && opciones[activo] ? idOpcion(activo) : undefined}
                    placeholder={t("ordenes.buscarProducto")}
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
                <ul
                    ref={lista}
                    id={idLista}
                    role="listbox"
                    aria-label={t("ordenes.productosEncontrados")}
                    hidden={!abierto}
                    className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-overlay"
                >
                    {/* Cerrada no lleva nada dentro: hay un buscador por línea, y sus opciones
                        ocultas seguirían en el documento con el disponible de cada producto. */}
                    {!abierto ? null : opciones.length === 0 ? (
                        <li role="presentation" className="px-3 py-2 text-sm text-foreground-muted">
                            {alDia ? t("ordenes.ningunProducto") : t("ordenes.buscandoProductos")}
                        </li>
                    ) : (
                        opciones.map((producto, i) => (
                            <li
                                key={producto.id}
                                id={idOpcion(i)}
                                role="option"
                                aria-selected={i === activo}
                                // `mousedown` y no `click`: el clic llega después del `blur` del campo,
                                // que ya ha cerrado la lista.
                                onMouseDown={(e) => { e.preventDefault(); elegir(producto); }}
                                onMouseEnter={() => setActivo(i)}
                                className={cn(
                                    "cursor-pointer px-3 py-2 text-sm",
                                    i === activo ? "bg-accent/10 text-foreground" : "text-foreground",
                                )}
                            >
                                <span className="font-medium">{producto.name}</span>
                                <span className="block text-xs text-foreground-muted tabular-nums">
                                    {producto.sku && <>{producto.sku} · </>}
                                    {t("ventas.form.disponible", { cantidad: producto.availableStock })}
                                </span>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
