import { useRef, useState } from "react";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/shared/lib/cn";

interface ProductImageUploadProps {
    currentImageUrl?: string;
    onChange: (file: File | undefined) => void;
    onRemoveExisting?: () => void;
    error?: string;
}

export function ProductImageUpload({ currentImageUrl, onChange, onRemoveExisting, error }: ProductImageUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onChange(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleRemove = () => {
        if (preview) {
            // Archivo nuevo seleccionado — limpia solo el preview local
            onChange(undefined);
            setPreview(null);
            if (inputRef.current) inputRef.current.value = "";
        } else {
            // Imagen guardada en servidor — avisa al padre para marcar removeImage=true
            onRemoveExisting?.();
        }
    };

    const displayed = preview ?? currentImageUrl;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Imagen</span>

            {displayed ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                    <img src={displayed} alt="Preview" className="w-full h-full object-cover" />
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute top-2 right-2 rounded-full bg-surface/80 p-1 text-foreground-muted hover:bg-surface shadow transition"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className={cn(
                        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm text-foreground-muted transition hover:border-info hover:text-info",
                        error && "border-danger",
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
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    );
}
