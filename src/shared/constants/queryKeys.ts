export const queryKeys = {
    user: ["user"] as const,
    product: ["products"] as const,
    categories: ["categories"] as const,
    brands: ["brands"] as const,
    suppliers: ["suppliers"] as const,
    tags: ["tags"] as const,
    users: ["users"] as const,
    settings: ["settings"] as const,
    auditLogs: ["audit-logs"] as const,
    saleOrders: ["sale-orders"] as const,
    customers: ["customers"] as const,
    purchaseOrders: ["purchase-orders"] as const,
    reports: ["reports"] as const,
    inventoryCounts: ["inventory-counts"] as const,
    notifications: ["notifications"] as const,
    // T5-14: la lista de almacenes, que casi no cambia, y lo que guarda cada uno, que cambia con
    // cada movimiento. La segunda va **bajo `products` a proposito**: todo lo que mueve stock ya
    // invalida esa clave, y asi no hay que acordarse en cada mutacion.
    warehouses: ["warehouses"] as const,
    warehousesSummary: ["products", "almacenes"] as const,
    stockTransfers: ["stock-transfers"] as const,
}
