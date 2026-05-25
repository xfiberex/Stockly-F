import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@/shared/components/Modal";
import { Input } from "@/shared/components/Input";
import { Select } from "@/shared/components/Select";
import { Button } from "@/shared/components/Button";
import { ProductImageUpload } from "./ProductImageUpload";
import { createProductSchema, updateProductSchema, VALID_CATEGORIES, type CreateProductFormData } from "@/modules/products/schemas/product.schema";
import { useCreateProduct } from "@/modules/products/hooks/useCreateProduct";
import { useUpdateProduct } from "@/modules/products/hooks/useUpdateProduct";
import type { Product } from "@/modules/products/types/product.types";
import type { Resolver } from "react-hook-form";

// Interface para el formulario de creación/edición de producto
interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    product?: Product;
}

// Opciones de categorías para el select, incluyendo una opción para "seleccionar"
const categoryOptions = VALID_CATEGORIES.map((c) => ({ value: c, label: c }));

// Componente de formulario para crear o editar un producto
export function ProductForm({ isOpen, onClose, product }: ProductFormProps) {
    const isEditing = !!product;
    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();
    const isPending = createMutation.isPending || updateMutation.isPending;
    const [removeImage, setRemoveImage] = useState(false);

    // Configuración del formulario con react-hook-form y validación con Zod
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CreateProductFormData>({
        resolver:
            zodResolver(isEditing ?
                updateProductSchema :
                createProductSchema) as Resolver<CreateProductFormData>,
    });

    // Efecto para cargar los datos del producto en el formulario cuando se abre en modo edición
    useEffect(() => {
        if (product) {
            reset({
                name: product.name,
                description: product.description ?? "",
                price: product.price,
                stock: product.stock,
                category: product.category as typeof VALID_CATEGORIES[number],
            });
        } else {
            reset({});
        }
    }, [product, reset]);

    // Función para manejar el envío del formulario, llama a la mutación correspondiente según si es creación o edición
    const onSubmit = (formData: CreateProductFormData) => {
        if (isEditing) {
            updateMutation.mutate(
                { id: product.id, dto: { ...formData, removeImage } },
                { onSuccess: () => { onClose(); reset({}); setRemoveImage(false); } }
            );
        } else {
            createMutation.mutate(formData, {
                onSuccess: () => { onClose(); reset({}); },
            });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Editar producto" : "Nuevo producto"}
            className="max-w-xl"
        >
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

                <Select
                    id="category"
                    label="Categoría *"
                    options={categoryOptions}
                    placeholder="Selecciona una categoría"
                    error={errors.category?.message}
                    {...register("category")}
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