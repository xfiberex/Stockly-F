import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import type { Product } from "@/modules/products/types/product.types";
import type { Resolver } from "react-hook-form";

interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product;
}

export function ProductForm({ isOpen, onClose, product }: ProductFormProps) {
    const isEditing = !!product;
    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();
    const isPending = createMutation.isPending || updateMutation.isPending;
    const [removeImage, setRemoveImage] = useState(false);

    const { data: categories = [] } = useCategories();
    const { data: brands = [] } = useBrands();
    const { data: suppliers = [] } = useSuppliers();

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

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateProductFormData>({
        resolver: zodResolver(isEditing ? updateProductSchema : createProductSchema) as Resolver<CreateProductFormData>,
    });

    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                description: product.description ?? "",
                price: product.price,
                stock: product.stock,
                categoryId: product.category?.id ?? "",
                brandId: product.brand?.id ?? "",
                supplierId: product.supplier?.id ?? "",
            });
        } else {
            reset({});
        }
    }, [product, reset]);

    const onSubmit = (formData: CreateProductFormData) => {
        // Normalizar strings vacíos a undefined para que el backend los ignore
        const normalized = {
            ...formData,
            categoryId: formData.categoryId || undefined,
            brandId: formData.brandId || undefined,
            supplierId: formData.supplierId || undefined,
        };

        if (isEditing) {
            updateMutation.mutate(
                { id: product.id, dto: { ...normalized, removeImage } },
                { onSuccess: () => { onClose(); reset({}); setRemoveImage(false); } },
            );
        } else {
            createMutation.mutate(normalized, {
                onSuccess: () => { onClose(); reset({}); },
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
                        label="Stock"
                        type="number"
                        placeholder="0"
                        error={errors.stock?.message}
                        {...register("stock")}
                    />
                </div>
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
