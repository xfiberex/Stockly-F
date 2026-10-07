import { useRef, type ChangeEvent } from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { toast } from "react-toastify";
import { Button } from "@/shared/components/Button";
import { useT } from "@/shared/hooks/useIdioma";
import { PESO_MAXIMO_DE_IMAGEN_MB } from "@/shared/contratos";
import { usePuede } from "@/modules/auth/hooks/usePuede";
import { useNegocio, useQuitarLogo, useSubirLogo } from "@/modules/settings/hooks/useNegocio";

// Los mismos tres formatos que `upload.middleware` del backend, y el tope del contrato. El
// servidor los rechaza igual —422 y 413, con su código—; comprobarlos aquí ahorra subir dos
// megas para enterarse.
const FORMATOS = ["image/jpeg", "image/png", "image/webp"];
const PESO_MAXIMO = PESO_MAXIMO_DE_IMAGEN_MB * 1024 * 1024;

/**
 * T6-03 — el logo del negocio. No va con «Guardar cambios», como el resto de la tarjeta: es un
 * archivo, no un valor, y se sube en cuanto se elige.
 */
export function LogoDelNegocio() {
    const { t } = useT();
    const puede = usePuede();
    const { data: negocio } = useNegocio();
    const subir = useSubirLogo();
    const quitar = useQuitarLogo();
    const archivo = useRef<HTMLInputElement>(null);

    const logoUrl = negocio?.logoUrl ?? null;

    const alElegir = (e: ChangeEvent<HTMLInputElement>) => {
        const elegido = e.target.files?.[0];
        // Se vacía siempre: sin esto, volver a elegir el mismo archivo tras un error no dispara
        // `change` y el botón parece no hacer nada.
        e.target.value = "";
        if (!elegido) return;

        if (!FORMATOS.includes(elegido.type)) return void toast.error(t("configuracion.logo.formato"));
        // El mismo texto que daría el servidor, con el tope que manda el contrato.
        if (elegido.size > PESO_MAXIMO) return void toast.error(t("error.IMAGE_TOO_LARGE", { megas: PESO_MAXIMO_DE_IMAGEN_MB }));

        subir.mutate(elegido);
    };

    return (
        <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-1 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
                    {logoUrl ? (
                        <img src={logoUrl} alt={t("configuracion.logo.alt")} className="h-full w-full object-contain" />
                    ) : (
                        <PhotoIcon className="h-6 w-6 text-foreground-muted" />
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{t("configuracion.logo.titulo")}</p>
                    <p className="mt-0.5 text-xs text-foreground-muted">{t("configuracion.logo.descripcion")}</p>
                </div>
            </div>

            <div className="flex shrink-0 gap-2">
                {puede("PUT /settings/logo") && (
                    <Button variant="secondary" onClick={() => archivo.current?.click()} isLoading={subir.isPending}>
                        {logoUrl ? t("configuracion.logo.cambiar") : t("configuracion.logo.subir")}
                    </Button>
                )}
                {logoUrl && puede("DELETE /settings/logo") && (
                    <Button variant="ghost" onClick={() => quitar.mutate()} isLoading={quitar.isPending}>
                        {t("configuracion.logo.quitar")}
                    </Button>
                )}
            </div>

            <input
                ref={archivo}
                type="file"
                accept={FORMATOS.join(",")}
                aria-label={t("configuracion.logo.archivo")}
                className="hidden"
                onChange={alElegir}
            />
        </div>
    );
}
