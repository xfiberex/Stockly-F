import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { CLASES_BOTON_ICONO } from "@/shared/lib/clasesDeBoton";
import { escribirNumeroDeVenta, tieneComprobante } from "@/shared/contratos";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { descargarComprobante } from "@/modules/sale-orders/api/sale-orders.api";
import type { SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";

interface BotonDeComprobanteProps {
    orden: Pick<SaleOrder, "id" | "number" | "status" | "shippedAt">;
    /** `icono` es el de una fila de tabla: sin texto, con el número de la venta en su nombre accesible. */
    variante?: "boton" | "icono";
}

/**
 * T6-07 — descarga el comprobante de una venta, desde su detalle y desde la ficha del cliente.
 *
 * **No pinta nada si la orden no lo tiene** —solo las enviadas, y las anuladas después de
 * enviarse: `tieneComprobante`, la misma regla con la que el servidor responde 409— o si el rol
 * no puede pedirlo. Un botón que siempre termina en un error no es un botón.
 *
 * Es un `<button>` que descarga por `descargarDeLaApi`, no un enlace a la API: el porqué está
 * en ese archivo. Mientras llega el PDF se queda girando y no admite un segundo clic.
 */
export function BotonDeComprobante({ orden, variante = "boton" }: BotonDeComprobanteProps) {
    const { t } = useT();
    const puede = usePuede();
    const [descargando, setDescargando] = useState(false);

    if (!puede("GET /sale-orders/:id/receipt") || !tieneComprobante(orden)) return null;

    const descargar = async () => {
        setDescargando(true);
        try {
            await descargarComprobante(orden);
        } finally {
            setDescargando(false);
        }
    };

    if (variante === "icono") {
        return (
            <Button
                type="button"
                variant="ghost"
                className={CLASES_BOTON_ICONO}
                title={t("ventas.comprobante.descargar")}
                aria-label={t("ventas.comprobante.descargarDe", { numero: escribirNumeroDeVenta(orden.number) })}
                isLoading={descargando}
                onClick={descargar}
            >
                {!descargando && <ArrowDownTrayIcon className="h-4 w-4" />}
            </Button>
        );
    }

    return (
        <Button type="button" variant="secondary" isLoading={descargando} onClick={descargar}>
            {!descargando && <ArrowDownTrayIcon className="h-4 w-4" />}
            {t("ventas.comprobante.descargar")}
        </Button>
    );
}
