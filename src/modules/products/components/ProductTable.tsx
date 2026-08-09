import { formatearImporte } from "@/shared/lib/moneda";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { clasesDeBoton } from "@/shared/lib/clasesDeBoton";
import { Spinner } from "@/shared/components/Spinner";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import { useDeleteProduct } from "@/modules/products/hooks/useDeleteProduct";
import { useRestoreProduct } from "@/modules/products/hooks/useRestoreProduct";
import { useAuth } from "@/modules/auth/hooks/useMe";
import type { Product } from "@/modules/products/types/product.types";
import { PencilIcon, TrashIcon, ArrowPathIcon, ChartBarIcon, EyeIcon, CubeIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";
import { EstadoBadge } from "@/shared/components/EstadoBadge";
import { NIVEL_STOCK, ACTIVIDAD, nivelDeStock, type NivelStock } from "@/shared/lib/estados";

// Clases literales, no `text-${variant}`: el escáner de Tailwind lee el código
// fuente como texto y no genera las utilidades que se construyen al vuelo.
const CLASE_NIVEL: Record<NivelStock, string> = {
    correcto: "text-foreground",
    bajo: "text-warning font-semibold",
    agotado: "text-danger font-semibold",
};

interface ProductTableProps {
    products: Product[];
    isLoading: boolean;
    onEdit: (product: Product) => void;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
}

export function ProductTable({ products, isLoading, onEdit, selectedIds, onToggleSelect }: ProductTableProps) {
    const deleteMutation = useDeleteProduct();
    const restoreMutation = useRestoreProduct();
    const { user } = useAuth();
    const isAdmin = user?.role === "ADMIN";
    const [detailProduct, setDetailProduct] = useState<Product | null>(null);

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <Spinner size="lg" />
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="py-16 text-center text-sm text-foreground-muted">No se encontraron productos</div>
        );
    }

    const selectable = !!onToggleSelect;

    // T2-15: el ajuste masivo de stock es destructivo y hasta ahora se seleccionaba fila
    // a fila, sin forma de marcar la página entera ni de saber —sin mirar— cuántas hay
    // marcadas. `onToggleSelect` actualiza con función, así que llamarlo en bucle es
    // seguro: cada llamada ve el conjunto que dejó la anterior.
    const seleccionados = products.filter((p) => selectedIds?.has(p.id));
    const todosSeleccionados = products.length > 0 && seleccionados.length === products.length;
    const algunosSeleccionados = seleccionados.length > 0;

    const alternarTodos = () => {
        const objetivo = todosSeleccionados
            ? products // estaban todos: se desmarcan todos
            : products.filter((p) => !selectedIds?.has(p.id)); // se completan los que faltan
        objetivo.forEach((p) => onToggleSelect!(p.id));
    };

    return (
        <>
        {/* `contain:paint` no es decoración: sin él, en Chrome de Android el ancho de
            esta tabla ensancha el *viewport de diseño* aunque el scroller la recorte, y
            todo lo `position: fixed` —los modales— pasa a medir más que la pantalla, con
            sus botones fuera del borde derecho. Medido: contenedor fijo 663 px en una
            pantalla de 393. Va en todos los scrollers horizontales; `desbordes.test.ts`
            lo vigila. */}
        <div className="overflow-x-auto contain-paint rounded-xl border border-border">
            <table className="w-full min-w-160 text-sm">
                {/* `whitespace-nowrap` en la cabecera entera —`white-space` se hereda— y no
                    columna a columna: con reparto automático de anchos, un nombre de producto
                    largo le quita sitio a las demás y la primera en partirse es la única
                    etiqueta con espacio dentro, «Stock / Mín». Romper un rótulo fijo de dos
                    palabras no gana nada; el ancho que sobra lo absorbe «Nombre / SKU», que sí
                    es texto variable. Truncar el nombre sería peor: es el identificador con el
                    que se escanea la tabla. */}
                <thead className="whitespace-nowrap bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    <tr>
                        {selectable && (
                            <th className="px-3 py-3 w-8">
                                <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center md:min-h-0 md:min-w-0">
                                    <input
                                        type="checkbox"
                                        aria-label="Seleccionar todos los productos de esta página"
                                        ref={(el) => {
                                            // El estado indeterminado no existe como atributo:
                                            // solo se puede poner por propiedad. Sin él, una
                                            // selección parcial se anuncia como «no marcado»,
                                            // que es justo lo contrario de lo que hay.
                                            if (el) el.indeterminate = algunosSeleccionados && !todosSeleccionados;
                                        }}
                                        checked={todosSeleccionados}
                                        onChange={alternarTodos}
                                        className="h-4 w-4 rounded border-border text-info focus:ring-accent"
                                    />
                                </label>
                            </th>
                        )}
                        <th className="px-4 py-3 lg:py-1.5">Imagen</th>
                        <th className="px-4 py-3 lg:py-1.5">Nombre / SKU</th>
                        <th className="px-4 py-3 lg:py-1.5">Categoría</th>
                        <th className="px-4 py-3 lg:py-1.5">Marca</th>
                        <th className="px-4 py-3 lg:py-1.5 text-right">Precio</th>
                        <th className="px-4 py-3 lg:py-1.5">Stock / Mín</th>
                        <th className="px-4 py-3 lg:py-1.5">Estado</th>
                        <th className="px-4 py-3 lg:py-1.5 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                    {products.map((product) => {
                        // El nivel distingue «agotado» de «bajo», que antes compartían color y
                        // aviso (T2-38); solo se resalta la fila de un producto activo, porque en
                        // uno dado de baja el stock ya no es una incidencia.
                        const nivel = product.isActive ? nivelDeStock(product.stock, product.minStock) : "correcto";
                        const incidencia = nivel !== "correcto" ? NIVEL_STOCK[nivel] : null;
                        return (
                            <tr
                                key={product.id}
                                className={cn(
                                    "hover:bg-surface-muted transition-colors",
                                    nivel === "bajo" && "bg-warning-surface/40",
                                    nivel === "agotado" && "bg-danger-surface/40",
                                )}
                            >
                                {selectable && (
                                    <td className="px-3 py-3 lg:py-1.5">
                                        {/* La casilla mide 16 px y no puede crecer sin desentonar,
                                            así que quien recibe el toque es la etiqueta que la
                                            envuelve: 44×44 hasta `md` (T2-40). */}
                                        <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center md:min-h-0 md:min-w-0">
                                            <input
                                                type="checkbox"
                                                // El nombre accesible va en `aria-label` y no en un
                                                // `sr-only` dentro de la etiqueta: ese texto se suma
                                                // al árbol de texto de la fila y el nombre del
                                                // producto pasaba a aparecer dos veces en ella.
                                                aria-label={`Seleccionar ${product.name}`}
                                                checked={selectedIds?.has(product.id) ?? false}
                                                onChange={() => onToggleSelect!(product.id)}
                                                className="h-4 w-4 rounded border-border text-info focus:ring-accent"
                                            />
                                        </label>
                                    </td>
                                )}
                                <td className="px-4 py-3 lg:py-1.5">
                                    {product.imageUrl ? (
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="h-10 w-10 lg:h-8 lg:w-8 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 lg:h-8 lg:w-8 rounded-lg bg-surface-muted flex items-center justify-center text-border">
                                            <CubeIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 lg:py-1.5">
                                    <Link
                                        to={`/catalog/products/${product.id}/movements`}
                                        className="font-medium text-foreground hover:text-info transition-colors"
                                    >
                                        {product.name}
                                    </Link>
                                    {product.sku && (
                                        <div className="text-xs text-foreground-muted font-mono">{product.sku}</div>
                                    )}
                                    {product.description && !product.sku && (
                                        <div className="text-xs text-foreground-muted truncate max-w-48">
                                            {product.description}
                                        </div>
                                    )}
                                </td>
                                {/* La categoría clasifica, no informa de un estado: variante neutra. */}
                                <td className="px-4 py-3 lg:py-1.5">
                                    {product.category ? (
                                        <Badge variant="neutral">{product.category.name}</Badge>
                                    ) : (
                                        <span className="text-xs text-foreground-muted">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 lg:py-1.5">
                                    {product.brand ? (
                                        <span className="text-sm text-foreground">{product.brand.name}</span>
                                    ) : (
                                        <span className="text-xs text-foreground-muted">—</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 lg:py-1.5 text-right text-foreground">
                                    {formatearImporte(product.price)}
                                </td>
                                <td className="px-4 py-3 lg:py-1.5">
                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                        {/* El stock va en una caja de ancho fijo y alineado a la
                                            derecha: con las cifras tabulares de la tabla, eso hace
                                            que las unidades queden en la misma vertical aunque
                                            detrás vengan el icono y el mínimo, que sí varían. */}
                                        <span className={cn("inline-block min-w-10 text-right", CLASE_NIVEL[nivel])}>
                                            {product.stock}
                                        </span>
                                        {/* El icono nombra el nivel además de teñirlo: sin él,
                                            «bajo» y «agotado» eran el mismo triángulo ámbar. */}
                                        {incidencia && (
                                            <>
                                                <incidencia.Icon className={cn("h-4 w-4", CLASE_NIVEL[nivel])} aria-hidden="true" />
                                                <span className="sr-only">{incidencia.label}</span>
                                            </>
                                        )}
                                        {product.minStock > 0 && (
                                            <span className="text-xs text-foreground-muted">/ {product.minStock}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 lg:py-1.5">
                                    <EstadoBadge estado={product.isActive ? ACTIVIDAD.activo : ACTIVIDAD.inactivo} />
                                </td>
                                <td className="px-4 py-3 lg:py-1.5">
                                    <div className="flex justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            title="Ver detalles"
                                            onClick={() => setDetailProduct(product)}
                                        >
                                            <EyeIcon className="h-4 w-4 text-foreground-muted" />
                                        </Button>
                                        {/* T2-14: era un `<button>` dentro de un `<a>`, que es
                                            HTML inválido: dos paradas de tabulación por fila
                                            para una sola acción, multiplicado por cada
                                            producto de la tabla. Como esto navega, se queda
                                            el enlace y toma prestadas las clases del botón. */}
                                        <Link
                                            to={`/catalog/products/${product.id}/movements`}
                                            title="Historial de movimientos"
                                            aria-label={`Historial de movimientos de ${product.name}`}
                                            className={clasesDeBoton("ghost")}
                                        >
                                            <ChartBarIcon className="h-4 w-4 text-info" />
                                        </Link>
                                        {isAdmin && product.isActive && (
                                            <>
                                                <Button variant="ghost" onClick={() => onEdit(product)} title="Editar">
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    isLoading={deleteMutation.isPending}
                                                    onClick={() => deleteMutation.mutate(product.id)}
                                                    title="Eliminar"
                                                >
                                                    <TrashIcon className="h-4 w-4 text-danger" />
                                                </Button>
                                            </>
                                        )}
                                        {isAdmin && !product.isActive && (
                                            <Button
                                                variant="ghost"
                                                isLoading={restoreMutation.isPending}
                                                onClick={() => restoreMutation.mutate(product.id)}
                                                title="Restaurar"
                                            >
                                                <ArrowPathIcon className="h-4 w-4 text-success" />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        <ProductDetailModal
            product={detailProduct}
            onClose={() => setDetailProduct(null)}
            onEdit={(p) => { setDetailProduct(null); onEdit(p); }}
        />
        </>
    );
}
