import { Select } from "@/shared/components/Select";
import { VALID_CATEGORIES } from "@/modules/products/schemas/product.schema";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface ProductFiltersProps {
    onFilterChange: (filters: {
        search?: string;
        category?: string;
        isActive?: boolean;
    }) => void;
}

const categoryOptions = [
    { value: "", label: "Todas las categorías" },
    ...VALID_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export function ProductFilters({ onFilterChange }: ProductFiltersProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [activeFilter, setActiveFilter] = useState<"true" | "false" | "">("true");

    const debouncedSearch = useDebounce(search, 400);

    useEffect(() => {
        onFilterChange({
            search: debouncedSearch || undefined,
            category: category || undefined,
            isActive: activeFilter === "true" ? true : activeFilter === "false" ? false : undefined,
        });
    }, [debouncedSearch, category, activeFilter, onFilterChange]);

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-48">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
            </div>

            <Select
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-w-44"
            />

            <Select
                options={[
                    { value: "true", label: "Solo activos" },
                    { value: "false", label: "Solo inactivos" },
                    { value: "", label: "Todos" },
                ]}
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as "true" | "false" | "")}
                className="min-w-40"
            />
        </div>
    );
}
