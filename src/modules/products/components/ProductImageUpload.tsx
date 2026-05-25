import { useRef, useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

// Interface para el componente de subida de imagen de producto
interface ProductImageUploadProps {
    currentImageUrl?: string;
    onChange: (file: File | undefined) => void;
    onRemoveExisting?: () => void;
    error?: string;
}

// Componente para subir imagen de producto con vista previa
export function ProductImageUpload({
    currentImageUrl,
    onChange,
    onRemoveExisting,
    error,
}: ProductImageUploadProps) {
    // Referencia al input de archivo para poder abrir el diálogo de selección
    const inputRef = useRef<HTMLInputElement>(null);

    // Estado para almacenar la URL de vista previa de la imagen seleccionada
    const [preview, setPreview] = useState<string | null>(null);

    // Maneja el cambio de archivo, actualiza la vista previa y llama al callback onChange
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onChange(file);
        setPreview(URL.createObjectURL(file));
    };

    // Maneja la eliminación de la imagen seleccionada, resetea el estado y el input
    const handleRemove = () => {
        if (preview) {
            // Había un archivo nuevo seleccionado — solo limpia el preview
            onChange(undefined);
            setPreview(null);
            if (inputRef.current) inputRef.current.value = "";
        } else {
            // Era la imagen guardada en el servidor — avisa al padre
            onRemoveExisting?.();
        }
    };

    // Determina qué imagen mostrar: la vista previa de la nueva imagen o la imagen actual del producto
    const displayed = preview ?? currentImageUrl;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Imagen</span>

            {displayed ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200">
                    <img
                        src={displayed}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 rounded-full bg-white/80 p-1 text-gray-600 hover:bg-white shadow transition"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm text-gray-400 transition hover:border-blue-400 hover:text-blue-500",
                        error && "border-red-400"
                    )}
                >
                    <PhotoIcon className="h-8 w-8" />
                    <span>Clic para subir imagen</span>
                    <span className="text-xs">PNG, JPG, WEBP</span>
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}