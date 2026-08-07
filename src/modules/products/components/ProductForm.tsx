import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SparklesIcon, TagIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { ProductImageUpload } from "./ProductImageUpload";
import { createProductSchema, updateProductSchema, type CreateProductFormData } from "@/modules/products/schemas/product.schema";
import { useCreateProduct } from "@/modules/products/hooks/useCreateProduct";
import { useUpdateProduct } from "@/modules/products/hooks/useUpdateProduct";
import { useCategories } from "@/modules/catalog/hooks/useCategories";
import { useBrands } from "@/modules/catalog/hooks/useBrands";
import { useSuppliers } from "@/modules/suppliers/hooks/useSuppliers";
import { useTags } from "@/modules/tags/hooks/useTags";
import type { Product } from "@/modules/products/types/product.types";
import type { Resolver } from "react-hook-form";

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product;
}

// `ProductsPage` monta este formulario con `key={editingProduct?.id ?? "new"}`, así
// que cambiar de producto lo remonta: los valores del producto pueden nacer ya
// puestos, en lugar de sincronizarse con un efecto tras el primer render.
function valoresIniciales(product?: Product) {
    if (!product) return {};

    return {
        name: product.name,
        description: product.description ?? "",
        sku: product.sku ?? "",
        price: product.price,
        stock: product.stock,
        minStock: product.minStock ?? 0,
        categoryId: product.category?.id ?? "",
        brandId: product.brand?.id ?? "",
        supplierId: product.supplier?.id ?? "",
    };
}

export function ProductForm({ isOpen, onClose, product }: ProductFormProps) {
    const isEditing = !!product;
    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();
    const isPending = createMutation.isPending || updateMutation.isPending;
    const [removeImage, setRemoveImage] = useState(false);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
        () => product?.tags?.map((t) => t.id) ?? [],
    );

    const { data: categories = [] } = useCategories();
    const { data: brands = [] } = useBrands();
    const { data: suppliers = [] } = useSuppliers();
    const { data: tags = [] } = useTags();

    const categoryOptions = [
        { value: "", label: "Sin categoría" },
        ...categories.map((c) => ({ value: c.id, label: c.name })),
    ];
    const brandOptions = [
        { value: "", label: "Sin marca" },
        ...brands.map((b) => ({ value: b.id, label: b.name })),
    ];
    const supplierOptions = [
        { value: "", label: "Sin proveedor" },
        ...suppliers.map((s) => ({ value: s.id, label: s.name })),
    ];

    const toggleTag = (id: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
        );
    };

    const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<CreateProductFormData>({
        resolver: zodResolver(isEditing ? updateProductSchema : createProductSchema) as Resolver<CreateProductFormData>,
        defaultValues: valoresIniciales(product),
    });

    const watchedName       = useWatch({ control, name: "name",       defaultValue: "" });
    const watchedCategoryId = useWatch({ control, name: "categoryId", defaultValue: "" });
    const watchedBrandId    = useWatch({ control, name: "brandId",    defaultValue: "" });

    const handleGenerateSku = () => {
        const removeDiacritics = (s: string) =>
            s.normalize("NFD").replace(/\p{Mn}/gu, "").toUpperCase();

        const category = categories.find((c) => c.id === watchedCategoryId);
        const brand    = brands.find((b) => b.id === watchedBrandId);
        const name     = watchedName ?? "";

        const catPrefix   = category ? removeDiacritics(category.name).replace(/[^A-Z]/g, "").slice(0, 3) : "GEN";
        const brandPrefix = brand    ? removeDiacritics(brand.name).replace(/[^A-Z]/g, "").slice(0, 3)    : "GEN";

        const STOP = new Set(["DE", "LA", "EL", "LOS", "LAS", "CON", "PARA", "Y", "E", "O", "A", "EN", "UN", "UNA", "THE", "WITH", "AND", "FOR", "GB", "TB", "MB"]);

        let cleanName = removeDiacritics(name);
        if (brand) cleanName = cleanName.replace(new RegExp(removeDiacritics(brand.name).replace(/[^A-Z]/g, ".?"), "g"), " ");

        const numbers  = name.match(/\d+/g) ?? [];
        const words    = cleanName.split(/[^A-Z]+/).filter((w) => w.length > 1 && !STOP.has(w));
        const wordPart = (words[0] ?? "").slice(0, 4);
        const numPart  = (numbers[0] ?? "").slice(0, 4);
        const code     = (wordPart + numPart).slice(0, 8) || "001";

        setValue("sku", `${catPrefix}-${brandPrefix}-${code}`, { shouldValidate: true });
    };

    const onSubmit = (formData: CreateProductFormData) => {
        const normalized = {
            ...formData,
            sku: formData.sku || undefined,
            categoryId: formData.categoryId || undefined,
            brandId: formData.brandId || undefined,
            supplierId: formData.supplierId || undefined,
            tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        };

        if (isEditing) {
            updateMutation.mutate(
                { id: product.id, dto: { ...normalized, tagIds: selectedTagIds, removeImage } },
                { onSuccess: () => { onClose(); reset({}); setRemoveImage(false); setSelectedTagIds([]); } },
            );
        } else {
            createMutation.mutate(normalized, {
                onSuccess: () => { onClose(); reset({}); setSelectedTagIds([]); },
            });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar producto" : "Nuevo producto"} className="max-w-xl">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <Input
                    id="name"
                    label="Nombre *"
                    placeholder="Ej: Laptop Pro 15"
                    error={errors.name?.message}
                    {...register("name")}
                />
                <Input
                    id="description"
                    label="Descripción"
                    placeholder="Descripción del producto"
                    error={errors.description?.message}
                    {...register("description")}
                />
                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <label htmlFor="sku" className="text-sm font-medium text-gray-700">
                            SKU / Código interno
                        </label>
                        <button
                            type="button"
                            onClick={handleGenerateSku}
                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            <SparklesIcon className="h-3.5 w-3.5" />
                            Generar
                        </button>
                    </div>
                    <Input
                        id="sku"
                        placeholder="Ej: ELE-SAM-A54"
                        error={errors.sku?.message}
                        {...register("sku")}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        id="price"
                        label="Precio *"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        error={errors.price?.message}
                        {...register("price")}
                    />
                    <Input
                        id="stock"
                        label="Stock inicial"
                        type="number"
                        placeholder="0"
                        error={errors.stock?.message}
                        {...register("stock")}
                    />
                </div>
                <Input
                    id="minStock"
                    label="Stock mínimo (alerta)"
                    type="number"
                    placeholder="0"
                    error={errors.minStock?.message}
                    {...register("minStock")}
                />
                <div className="grid grid-cols-2 gap-3">
                    <Select
                        id="categoryId"
                        label="Categoría"
                        options={categoryOptions}
                        error={errors.categoryId?.message}
                        {...register("categoryId")}
                    />
                    <Select
                        id="brandId"
                        label="Marca"
                        options={brandOptions}
                        error={errors.brandId?.message}
                        {...register("brandId")}
                    />
                </div>
                <Select
                    id="supplierId"
                    label="Proveedor"
                    options={supplierOptions}
                    error={errors.supplierId?.message}
                    {...register("supplierId")}
                />
                {tags.length > 0 && (
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                            <TagIcon className="h-3.5 w-3.5 text-gray-400" />
                            Etiquetas
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => {
                                const isSelected = selectedTagIds.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.id)}
                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                            isSelected
                                                ? "border-transparent text-white"
                                                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                        }`}
                                        style={isSelected ? { backgroundColor: tag.color ?? "#6366f1" } : {}}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.6)" : (tag.color ?? "#94a3b8") }}
                                        />
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <ProductImageUpload
                    currentImageUrl={removeImage ? undefined : product?.imageUrl}
                    onChange={(file) => setValue("image", file)}
                    onRemoveExisting={() => setRemoveImage(true)}
                    error={errors.image?.message}
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={isPending}>
                        {isEditing ? "Guardar cambios" : "Crear producto"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
