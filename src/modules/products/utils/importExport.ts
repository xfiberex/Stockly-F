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
    // Previene inyección de fórmulas (CSV injection): una celda que empieza con
    // = + - @ tab o retorno de carro puede ejecutarse como fórmula en Excel/Sheets.
    // Se antepone un apóstrofo para que el gestor la trate como texto literal.
    const guarded = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
    if (guarded.includes(",") || guarded.includes('"') || guarded.includes("\n")) {
        return `"${guarded.replace(/"/g, '""')}"`;
    }
    return guarded;
}

export function toCsv(products: ExportedProduct[]): string {
    const rows = products.map((p) =>
        EXPORT_HEADERS.map((h) => escapeCsvField(p[h])).join(","),
    );
    return [EXPORT_HEADERS.join(","), ...rows].join("\n");
}

/**
 * T2-34 — un CSV listo para Excel en Windows.
 *
 * Excel no mira el `charset` del blob ni el de la cabecera: si el archivo no empieza por
 * la marca de orden de bytes (`U+FEFF`), lo abre con la página de códigos del sistema y
 * cualquier acento sale roto — «Electrónica» se ve como «ElectrÃ³nica». Es el defecto
 * clásico de exportar catálogos en español, y no se nota hasta que alguien abre el
 * archivo en Excel, no en un editor.
 *
 * La marca **no estorba al reimportar**: `parseCsv` empieza con `text.trim()`, y `trim()`
 * elimina `U+FEFF` porque el estándar lo cuenta como espacio en blanco. Hay un test que
 * lo fija, porque es una casualidad afortunada y no algo evidente al leer el código.
 */
export function blobCsv(texto: string): Blob {
    return new Blob(["\uFEFF" + texto], { type: "text/csv;charset=utf-8;" });
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
