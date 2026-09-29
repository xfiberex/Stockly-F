import { Select } from "@/shared/components/Select";
import { useCategories } from "@/modules/catalog/hooks/useCategories";
import { useTags } from "@/modules/tags/hooks/useTags";
import { useAbcSummary } from "@/modules/reports/hooks/useReports";
import type { AbcClass } from "@/modules/reports/types/reports.types";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useT } from "@/shared/hooks/useIdioma";

interface ProductFiltersProps {
    onFilterChange: (filters: {
        search?: string;
        categoryId?: string;
        tagId?: string;
        isActive?: boolean;
        abcClass?: AbcClass;
    }) => void;
}

const CLASES_ABC: AbcClass[] = ["A", "B", "C"];

export function ProductFilters({ onFilterChange }: ProductFiltersProps) {
    const { t } = useT();
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [tagId, setTagId] = useState("");
    const [activeFilter, setActiveFilter] = useState<"true" | "false" | "">("true");
    const [abcClass, setAbcClass] = useState<AbcClass | "">("");

    const debouncedSearch = useDebounce(search, 400);
    const { data: categories = [] } = useCategories();
    const { data: tags = [] } = useTags();
    const { data: resumenAbc } = useAbcSummary();

    const categoryOptions = [
        { value: "", label: t("productos.filtro.todasCategorias") },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];

    const tagOptions = [
        { value: "", label: t("productos.filtro.todasEtiquetas") },
        ...tags.map((t) => ({ value: t.id, label: t.name })),
    ];

    // T5-10 — con el recuento de cada clase cuando ya ha llegado. El de C cuenta el catálogo
    // entero, activos e inactivos: es lo que devuelve el filtro con «Todos» en el estado.
    const abcOptions = [
        { value: "", label: t("productos.filtro.todasClasesAbc") },
        ...CLASES_ABC.map((clase) => ({
            value: clase,
            label: resumenAbc
                ? t("productos.abc.claseConCantidad", { clase, cantidad: resumenAbc.counts[clase] })
                : t("productos.abc.clase", { clase }),
        })),
    ];

    useEffect(() => {
        onFilterChange({
            search: debouncedSearch || undefined,
            categoryId: categoryId || undefined,
            tagId: tagId || undefined,
            isActive: activeFilter === "true" ? true : activeFilter === "false" ? false : undefined,
            abcClass: abcClass || undefined,
        });
    }, [debouncedSearch, categoryId, tagId, activeFilter, abcClass, onFilterChange]);

    return (
        /*
         * Rejilla, no `flex-wrap`.
         *
         * Con `flex-wrap` y `min-w-36`, a 412 px caben dos controles por fila —144 + 144 +
         * 12 de hueco entra en los 364 útiles— y ninguno de los dos llega a mostrar su
         * texto: «Todas las categorías» se quedaba en «Todas las catego…». Un desplegable
         * que no deja leer la opción elegida no filtra nada.
         *
         * En móvil va uno por fila. De `sm` en adelante, dos columnas con el buscador
         * ocupando la de arriba entera —es el control que más se usa y el que más se
         * agradece ancho—, y de `lg` en adelante los cuatro en línea, como estaban.
         *
         * T5-10 — con la clase ABC son cinco. En `lg` el buscador vuelve a ocupar su fila y los
         * cuatro desplegables van debajo, en línea; cinco en línea a ese ancho volvían a dejar
         * cada uno en ~150 px, que es el problema de arriba. Los cinco juntos, desde `xl`.
         */
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <div className="relative sm:col-span-2 lg:col-span-4 xl:col-span-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                <input
                    type="text"
                    placeholder={t("productos.filtro.buscar")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition md:min-h-9"
                />
            </div>

            <div>
                <Select
                    aria-label={t("productos.filtro.porCategoria")}
                    options={categoryOptions}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full"
                />
            </div>

            {tags.length > 0 && (
                <div>
                    <Select
                        aria-label={t("productos.filtro.porEtiqueta")}
                        options={tagOptions}
                        value={tagId}
                        onChange={(e) => setTagId(e.target.value)}
                        className="w-full"
                    />
                </div>
            )}

            <div>
                <Select
                    aria-label={t("productos.filtro.porEstado")}
                    options={[
                        { value: "true", label: t("productos.filtro.soloActivos") },
                        { value: "false", label: t("productos.filtro.soloInactivos") },
                        { value: "", label: t("comun.todos") },
                    ]}
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value as "true" | "false" | "")}
                    className="w-full"
                />
            </div>

            <div>
                <Select
                    aria-label={t("productos.filtro.porClaseAbc")}
                    options={abcOptions}
                    value={abcClass}
                    onChange={(e) => setAbcClass(e.target.value as AbcClass | "")}
                    className="w-full"
                />
            </div>
        </div>
    );
}
