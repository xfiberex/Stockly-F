import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { NotificationsAPI } from "@/modules/notifications/api/notifications.api";
import type { Notifications, UnreadCount } from "@/modules/notifications/types/notification.types";
import { queryKeys } from "@/shared/constants/queryKeys";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

/**
 * Cada cuánto se pregunta. Un aviso de stock bajo no es de segundos: un minuto basta, y es una
 * consulta que solo cuenta filas.
 */
export const INTERVALO_DE_AVISOS = 60_000;

const CLAVE_SIN_LEER = [...queryKeys.notifications, "sin-leer"] as const;
const CLAVE_LISTA = [...queryKeys.notifications, "lista"] as const;

/**
 * Las dos opciones que hacen de esto una **consulta periódica**, y no un WebSocket:
 *
 * - `refetchInterval`, que React Query **pausa solo** con la pestaña en segundo plano
 *   (`refetchIntervalInBackground` es `false` por defecto): una pestaña olvidada no pregunta.
 * - `refetchOnWindowFocus`, que el resto de la aplicación tiene apagado a propósito (ver
 *   `queryClient.ts`) y aquí se enciende: al volver a la pestaña, el contador se pone al día
 *   sin esperar al minuto. Es lo que hace que marcar un aviso en otra pestaña se note en esta.
 */
const PERIODICA = { refetchInterval: INTERVALO_DE_AVISOS, refetchOnWindowFocus: true, staleTime: 0 } as const;

/** El número de la campana. */
export function useUnreadCount() {
    return useQuery({ queryKey: CLAVE_SIN_LEER, queryFn: NotificationsAPI.unreadCount, ...PERIODICA });
}

/** La lista, que solo se pide con el panel abierto. */
export function useNotifications(abierto: boolean) {
    return useQuery({ queryKey: CLAVE_LISTA, queryFn: NotificationsAPI.getAll, enabled: abierto, ...PERIODICA });
}

/**
 * Tras marcar, las dos cachés se corrigen **a mano** con lo que ha respondido el servidor, en
 * vez de invalidarse: el punto desaparece y el número baja en el mismo instante, sin el
 * parpadeo de volver a pedir la lista.
 */
function aplicar(qc: QueryClient, { unread }: UnreadCount, leido: (id: string) => boolean) {
    const ahora = new Date().toISOString();
    qc.setQueryData<UnreadCount>(CLAVE_SIN_LEER, { unread });
    qc.setQueryData<Notifications>(CLAVE_LISTA, (lista) =>
        lista && {
            unread,
            items: lista.items.map((aviso) => (aviso.readAt === null && leido(aviso.id) ? { ...aviso, readAt: ahora } : aviso)),
        },
    );
}

export function useMarkNotificationRead() {
    const qc = useQueryClient();
    const { idioma } = useT();
    return useMutation({
        mutationFn: NotificationsAPI.markRead,
        onSuccess: (respuesta, id) => aplicar(qc, respuesta, (otro) => otro === id),
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useMarkAllNotificationsRead() {
    const qc = useQueryClient();
    const { idioma } = useT();
    return useMutation({
        mutationFn: NotificationsAPI.markAllRead,
        onSuccess: (respuesta) => aplicar(qc, respuesta, () => true),
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
