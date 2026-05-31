import type { ExportedProduct, ImportProductDto } from "../types/product.types";

// ── Export ────────────────────────────────────────────────────────────────────

const EXPORT_HEADERS: (keyof ExportedProduct)[] = [
    "name",
    "description",
    "price",
    "stock",
    "categoryName",
    "brandName",
    "supplierName",
    "isActive",
];

function escapeCsvField(value: string | number | boolean | null | undefined): string {
    const str = value === null || value === undefined ? "" : String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function toCsv(products: ExportedProduct[]): string {
    const rows = products.map((p) =>
        EXPORT_HEADERS.map((h) => escapeCsvField(p[h])).join(","),
    );
    return [EXPORT_HEADERS.join(","), ...rows].join("\n");
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Import ────────────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

export function parseCsv(text: string): ImportProductDto[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) throw new Error("El CSV debe tener encabezado y al menos una fila de datos");

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

    return lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] ?? ""; });

        return {
            name: row["name"] ?? "",
            description: row["description"] || undefined,
            price: parseFloat(row["price"]) || 0,
            stock: row["stock"] !== undefined && row["stock"] !== "" ? parseInt(row["stock"], 10) : undefined,
            categoryName: row["categoryname"] || undefined,
            brandName: row["brandname"] || undefined,
            isActive: row["isactive"] !== undefined ? row["isactive"].toLowerCase() !== "false" : undefined,
        } satisfies ImportProductDto;
    });
}
