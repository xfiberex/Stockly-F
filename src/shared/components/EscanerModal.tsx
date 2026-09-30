import { useEffect, useRef, useState, type FormEvent } from "react";
import { CameraIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Modal } from "@/shared/components/Modal";
import { Button } from "@/shared/components/Button";
import { Input } from "@/shared/components/Input";
import { Spinner } from "@/shared/components/Spinner";
import { obtenerLector } from "@/shared/lib/escaner";
import { useT } from "@/shared/hooks/useIdioma";
import type { Clave } from "@/shared/i18n/traducir";

interface EscanerModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** El código leído o escrito, ya sin espacios alrededor. Cerrar el modal es cosa de quien llama. */
    onCodigo: (codigo: string) => void;
    title?: string;
}

type EstadoCamara = "iniciando" | "escaneando" | "sinCamara" | "insegura" | "denegada";

/** Cada cuánto se mira un fotograma. Más a menudo solo calienta el móvil: el pulso no va más rápido. */
const INTERVALO_MS = 250;

const AVISO_DE_CAMARA: Partial<Record<EstadoCamara, Clave>> = {
    sinCamara: "escaner.sinCamara",
    insegura: "escaner.insegura",
    denegada: "escaner.denegada",
};

/**
 * T5-08 — el escáner: cámara en vivo, una foto o el código escrito.
 *
 * Las tres vías están siempre, porque cada una cubre un caso que las otras no:
 *
 * - **La cámara** es lo normal en el móvil, pero el navegador solo la da en un contexto seguro
 *   (HTTPS o `localhost`). Abrir la aplicación por la IP de la red local, que es como se prueba
 *   en un móvil, **no** lo es.
 * - **La foto** usa el selector de archivos, que con `capture` abre la cámara del sistema y no
 *   necesita ese permiso. Es además cómo lo prueba el E2E, con la imagen de una etiqueta.
 * - **Escribirlo** es también como llega un lector de pistola USB: teclea el código y pulsa
 *   Intro. Sin este campo, esos lectores —los de una caja de verdad— no servirían.
 */
export function EscanerModal({ isOpen, onClose, onCodigo, title }: EscanerModalProps) {
    const { t } = useT();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title ?? t("escaner.titulo")} className="max-w-md">
            {/* Montado solo con el modal abierto: al cerrarlo se apaga la cámara. */}
            {isOpen && <Contenido onCodigo={onCodigo} />}
        </Modal>
    );
}

function Contenido({ onCodigo }: { onCodigo: (codigo: string) => void }) {
    const { t } = useT();
    const video = useRef<HTMLVideoElement>(null);
    const archivo = useRef<HTMLInputElement>(null);
    const [camara, setCamara] = useState<EstadoCamara>("iniciando");
    const [aviso, setAviso] = useState<Clave | null>(null);
    const [leyendoFoto, setLeyendoFoto] = useState(false);
    const [escrito, setEscrito] = useState("");
    // Un código por apertura, venga por la vía que venga: con la cámara ya entregando, una foto
    // que termina de leerse o un Intro en el campo no pueden mandar un segundo a quien llama,
    // que puede estar todavía buscando el primero.
    const entregado = useRef(false);

    const entregar = (codigo: string) => {
        if (entregado.current) return;
        entregado.current = true;
        navigator.vibrate?.(80);
        onCodigo(codigo);
    };

    useEffect(() => {
        let cancelado = false;
        let flujo: MediaStream | null = null;
        let temporizador: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            if (!window.isSecureContext) return setCamara("insegura");
            if (!navigator.mediaDevices?.getUserMedia) return setCamara("sinCamara");
            try {
                flujo = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
            } catch (error) {
                if (!cancelado) setCamara(error instanceof DOMException && error.name === "NotAllowedError" ? "denegada" : "sinCamara");
                return;
            }
            if (cancelado || !video.current) return;
            video.current.srcObject = flujo;
            await video.current.play().catch(() => undefined);
            const lector = await obtenerLector();
            if (cancelado) return;
            setCamara("escaneando");

            const mirar = async () => {
                if (cancelado || entregado.current) return;
                const v = video.current;
                if (v && v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    const codigo = await lector.detectar(v).catch(() => null);
                    if (codigo && !cancelado) return entregar(codigo);
                }
                temporizador = setTimeout(mirar, INTERVALO_MS);
            };
            mirar();
        })();

        return () => {
            cancelado = true;
            clearTimeout(temporizador);
            flujo?.getTracks().forEach((pista) => pista.stop());
        };
        // `entregar` lee solo refs y la prop, que no cambian mientras el modal está abierto.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const leerFoto = async (foto: File | undefined) => {
        if (!foto) return;
        setAviso(null);
        setLeyendoFoto(true);
        try {
            const lector = await obtenerLector();
            const codigo = await lector.detectar(await createImageBitmap(foto));
            if (codigo) entregar(codigo);
            else setAviso("escaner.fotoSinCodigo");
        } catch {
            setAviso("escaner.fotoIlegible");
        } finally {
            setLeyendoFoto(false);
        }
    };

    const enviarEscrito = (e: FormEvent) => {
        e.preventDefault();
        const codigo = escrito.trim();
        if (codigo) entregar(codigo);
    };

    const avisoDeCamara = AVISO_DE_CAMARA[camara];

    return (
        <div className="flex flex-col gap-4">
            {avisoDeCamara ? (
                <p className="rounded-lg bg-surface-muted p-3 text-sm text-foreground-muted">{t(avisoDeCamara)}</p>
            ) : (
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
                    <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label={t("escaner.camara")} />
                    {camara === "iniciando" ? (
                        <div className="absolute inset-0 flex items-center justify-center"><Spinner size="lg" /></div>
                    ) : (
                        // La línea de puntería: dónde poner el código, no un adorno.
                        <div aria-hidden="true" className="absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-danger/80" />
                    )}
                </div>
            )}

            <div className="flex flex-col gap-2">
                {/* El botón va antes que el campo oculto: el modal enfoca el primer control, y un
                    `display: none` no se puede enfocar. */}
                <Button variant="secondary" onClick={() => archivo.current?.click()} isLoading={leyendoFoto}>
                    <CameraIcon className="h-4 w-4" />
                    {t("escaner.foto")}
                </Button>
                <input
                    ref={archivo}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { void leerFoto(e.target.files?.[0]); e.target.value = ""; }}
                    aria-label={t("escaner.foto")}
                    data-testid="escaner-foto"
                />
                {aviso && <p role="alert" className="text-sm text-danger">{t(aviso)}</p>}
            </div>

            <form onSubmit={enviarEscrito} className="flex items-end gap-2 border-t border-border pt-4">
                <div className="flex-1">
                    <Input
                        label={t("escaner.escribir")}
                        value={escrito}
                        onChange={(e) => setEscrito(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </div>
                <Button type="submit" disabled={escrito.trim() === ""}>
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    {t("escaner.buscar")}
                </Button>
            </form>
        </div>
    );
}
