import api from "@/shared/api/axios";
import type { ApiResponse } from "@/shared/types";
import type { Notifications, UnreadCount } from "@/modules/notifications/types/notification.types";

export const NotificationsAPI = {
    getAll: async () => {
        const { data } = await api.get<ApiResponse<Notifications>>("/notifications");
        return data.data!;
    },
    unreadCount: async () => {
        const { data } = await api.get<ApiResponse<UnreadCount>>("/notifications/unread-count");
        return data.data!;
    },
    markRead: async (id: string) => {
        const { data } = await api.post<ApiResponse<UnreadCount>>(`/notifications/${id}/read`);
        return data.data!;
    },
    markAllRead: async () => {
        const { data } = await api.post<ApiResponse<UnreadCount>>("/notifications/read-all");
        return data.data!;
    },
};
