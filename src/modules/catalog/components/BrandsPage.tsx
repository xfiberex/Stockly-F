import { useBrands } from "@/modules/catalog/hooks/useBrands";
import { useCreateBrand, useUpdateBrand, useDeleteBrand } from "@/modules/catalog/hooks/useBrandMutations";
import { CatalogItemSection } from "@/modules/catalog/components/CatalogItemSection";

export default function BrandsPage() {
    const { data: brands = [], isLoading } = useBrands();
    const createMutation = useCreateBrand();
    const updateMutation = useUpdateBrand();
    const deleteMutation = useDeleteBrand();

    return (
        <CatalogItemSection
            textos={{
                titulo: "ruta.marcas",
                descripcion: "catalogo.marcas.descripcion",
                nueva: "catalogo.marcas.nueva",
                editar: "catalogo.marcas.editar",
                vacio: "catalogo.marcas.vacio",
            }}
            items={brands}
            isLoading={isLoading}
            onCreate={(data, alGuardar) => createMutation.mutate(data, { onSuccess: alGuardar })}
            onUpdate={(id, data, alGuardar) => updateMutation.mutate({ id, form: data }, { onSuccess: alGuardar })}
            onDelete={(id) => deleteMutation.mutate(id)}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            isDeleting={deleteMutation.isPending}
        />
    );
}
