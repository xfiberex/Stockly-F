import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { getProductByCode } from "../api/product.api";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";
import type { ProductWithAvailability } from "../types/product.types";

/**
 * T5-08 — buscar el producto de un código escaneado.
 *
 * Devuelve el producto, `null` si ningún producto tiene ese código —que no es un error: es lo
 * que lleva a ofrecer darlo de alta— o `undefined` si la búsqueda falló, que ya se ha avisado.
 * Es imperativo y no una consulta de React Query: se busca una vez por escaneo, y guardar en
 * caché «este código no existe» haría que darlo de alta no se viera al volver a escanearlo.
 */
export function useBuscarPorCodigo() {
    const { idioma } = useT();
    const [buscando, setBuscando] = useState(false);

    const buscar = async (codigo: string): Promise<ProductWithAvailability | null | undefined> => {
        setBuscando(true);
        try {
            return await getProductByCode(codigo);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) return null;
            toast.error(mensajeDeError(idioma, error));
            return undefined;
        } finally {
            setBuscando(false);
        }
    };

    return { buscar, buscando };
}
