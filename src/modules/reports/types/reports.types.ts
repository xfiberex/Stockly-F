export interface ReportTotals {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    inventoryValue: number;
}

export interface StockByCategory {
    name: string;
    stock: number;
    value: number;
}

export interface TopProduct {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    stock: number;
    totalValue: number;
}

export interface MovementByMonth {
    month: string;
    type: string;
    total: number;
}

export interface LowStockProduct {
    id: string;
    name: string;
    sku: string | null;
    stock: number;
    minStock: number;
    category: string | null;
}

export interface ReportSummary {
    totals: ReportTotals;
    stockByCategory: StockByCategory[];
    topByValue: TopProduct[];
    movementsByMonth: MovementByMonth[];
    lowStockProducts: LowStockProduct[];
}
