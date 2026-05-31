import { useCategories } from "@/modules/catalog/hooks/useCategories";
import { useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/modules/catalog/hooks/useCategoryMutations";
import { CatalogItemSection } from "@/modules/catalog/components/CatalogItemSection";

export default function CategoriesPage() {
    const { data: categories = [], isLoading } = useCategories();
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();

    return (
        <CatalogItemSection
            title="Categorías"
            description="Organiza tus productos por tipo"
            entityLabel="Categoría"
            items={categories}
            isLoading={isLoading}
            onCreate={(data) => createMutation.mutate(data)}
            onUpdate={(id, data) => updateMutation.mutate({ id, form: data })}
            onDelete={(id) => deleteMutation.mutate(id)}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
        />
    );
}
