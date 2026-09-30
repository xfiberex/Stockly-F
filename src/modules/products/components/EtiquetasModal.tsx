import { useState } from "react";
import { DocumentTextIcon, PrinterIcon, TagIcon } from "@heroicons/react/24/outline";
import { Modal } from "@/shared/components/Modal";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { OpcionesSegmentadas, type OpcionSegmentada } from "@/shared/components/OpcionesSegmentadas";
import { descargarEtiquetas, type FormatoEtiquetas } from "@/modules/products/api/product.api";
import { useT } from "@/shared/hooks/useIdioma";
import type { ProductoEtiquetable } from "@/modules/products/types/product.types";

interface EtiquetasModalProps {
    isOpen: boolean;
    onClose: () => void;
    productos: ProductoEtiquetable[];
}

/** El tope del backend (`MAX_ETIQUETAS`): pasarse daría un 400 al pulsar. */
const MAX_ETIQUETAS = 2000;

/**
 * T5-08 — imprimir etiquetas con el código de barras de uno o varios productos.
 *
 * Un producto sin código de barras ni SKU no tiene nada que imprimir, y el backend rechaza la
 * petición entera si llega alguno. Aquí se apartan antes y **se dice cuántos**: quitarlos en
 * silencio dejaría a quien pega las etiquetas buscando la que falta.
 */
export function EtiquetasModal({ isOpen, onClose, productos }: EtiquetasModalProps) {
    const { t, tn } = useT();
    const [formato, setFormato] = useState<FormatoEtiquetas>("sheet");
    const [copias, setCopias] = useState("1");
    const [descargando, setDescargando] = useState(false);

    const conCodigo = productos.filter((p) => p.barcode || p.sku);
    const sinCodigo = productos.length - conCodigo.length;
    const n = Number(copias);
    const copiasValidas = Number.isInteger(n) && n >= 1 && conCodigo.length * n <= MAX_ETIQUETAS;

    const opciones: Array<OpcionSegmentada<FormatoEtiquetas>> = [
        { valor: "sheet", etiqueta: t("etiquetas.formato.sheet"), descripcion: t("etiquetas.formato.sheetAyuda"), Icono: DocumentTextIcon },
        { valor: "label", etiqueta: t("etiquetas.formato.label"), descripcion: t("etiquetas.formato.labelAyuda"), Icono: TagIcon },
    ];

    const descargar = async () => {
        setDescargando(true);
        try {
            if (await descargarEtiquetas(conCodigo.map((p) => p.id), formato, n)) onClose();
        } finally {
            setDescargando(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t("etiquetas.titulo")} className="max-w-md">
            <div className="flex flex-col gap-4">
                <p className="text-sm text-foreground">
                    {conCodigo.length === 1 ? conCodigo[0]!.name : tn("etiquetas.productos", conCodigo.length)}
                </p>
                {sinCodigo > 0 && (
                    <p role="status" className="rounded-lg bg-warning-surface p-3 text-sm text-warning">
                        {tn("etiquetas.sinCodigo", sinCodigo)}
                    </p>
                )}

                <OpcionesSegmentadas
                    leyenda={t("etiquetas.formato")}
                    ayuda={t("etiquetas.formatoAyuda")}
                    nombre="formato-etiquetas"
                    opciones={opciones}
                    valor={formato}
                    onCambio={setFormato}
                />

                <Input
                    label={t("etiquetas.copias")}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={copias}
                    onChange={(e) => setCopias(e.target.value)}
                    error={copiasValidas ? undefined : t("etiquetas.copiasInvalidas", { maximo: MAX_ETIQUETAS })}
                />

                <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Button variant="secondary" onClick={onClose}>{t("comun.cancelar")}</Button>
                    <Button onClick={descargar} disabled={conCodigo.length === 0 || !copiasValidas} isLoading={descargando}>
                        <PrinterIcon className="h-4 w-4" />
                        {tn("etiquetas.descargar", conCodigo.length * (copiasValidas ? n : 0))}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
