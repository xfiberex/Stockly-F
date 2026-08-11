import { Select } from "@/shared/components/Select";
import { useCategories } from "@/modules/catalog/hooks/useCategories";
import { useTags } from "@/modules/tags/hooks/useTags";
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
    }) => void;
}

export function ProductFilters({ onFilterChange }: ProductFiltersProps) {
    const { t } = useT();
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [tagId, setTagId] = useState("");
    const [activeFilter, setActiveFilter] = useState<"true" | "false" | "">("true");

    const debouncedSearch = useDebounce(search, 400);
    const { data: categories = [] } = useCategories();
    const { data: tags = [] } = useTags();

    const categoryOptions = [
        { value: "", label: t("productos.filtro.todasCategorias") },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];

    const tagOptions = [
        { value: "", label: t("productos.filtro.todasEtiquetas") },
        ...tags.map((t) => ({ value: t.id, label: t.name })),
    ];

    useEffect(() => {
        onFilterChange({
            search: debouncedSearch || undefined,
            categoryId: categoryId || undefined,
            tagId: tagId || undefined,
            isActive: activeFilter === "true" ? true : activeFilter === "false" ? false : undefined,
        });
    }, [debouncedSearch, categoryId, tagId, activeFilter, onFilterChange]);

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-48">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
                <input
                    type="text"
                    placeholder={t("productos.filtro.buscar")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-border pl-9 pr-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition md:min-h-9"
                />
            </div>

            <div className="flex-1 min-w-36">
                <Select
                    options={categoryOptions}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full"
                />
            </div>

            {tags.length > 0 && (
                <div className="flex-1 min-w-36">
                    <Select
                        options={tagOptions}
                        value={tagId}
                        onChange={(e) => setTagId(e.target.value)}
                        className="w-full"
                    />
                </div>
            )}

            <div className="flex-1 min-w-36">
                <Select
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
        </div>
    );
}
