import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";

interface PaginacionProps {
    page: number;
    totalPages: number;
    onPage: (page: number) => void;
}

/**
 * «Página 2 de 5» con anterior y siguiente. Con una sola página no pinta nada.
 *
 * Nació dentro de la pantalla del conteo (T5-07); T5-06 la trajo aquí para los clientes y su
 * historial de ventas en vez de copiarla.
 */
export function Paginacion({ page, totalPages, onPage }: PaginacionProps) {
    const { t } = useT();
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between px-4 py-3 text-sm text-foreground-muted">
            <span>{t("comun.paginaDeTotal", { pagina: page, total: totalPages })}</span>
            <div className="flex gap-2">
                <Button variant="secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>{t("comun.anterior")}</Button>
                <Button variant="secondary" disabled={page === totalPages} onClick={() => onPage(page + 1)}>{t("comun.siguiente")}</Button>
            </div>
        </div>
    );
}
