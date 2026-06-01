export interface AuditLog {
    id: string;
    userId: string | null;
    userEmail: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    details: Record<string, unknown> | null;
    createdAt: string;
}

export interface AuditLogsQuery {
    page?: number;
    limit?: number;
    entity?: string;
    action?: string;
    userId?: string;
}
