import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatearImporte } from "@/shared/lib/moneda";

// T2-44: el defecto que originó la tarea era ver `$14999.00` y `$1,234,567.89` en la
// misma fila de la tabla «Top por valor». No era un descuido puntual: había 10 usos de
// `toFixed(2)` y 12 de `toLocaleString` sin ningún helper que los uniera.

describe("formatearImporte (T2-44)", () => {
    it("lleva separador de miles y dos decimales", () => {
        expect(formatearImporte(14999)).toBe("$14,999.00");
        expect(formatearImporte(1234567.891)).toBe("$1,234,567.89");
    });

    it("acepta la cadena que envía la API para los `Decimal` de Prisma", () => {
        // `product.price` llega como string desde el backend; el formato no puede
        // depender de que alguien se acuerde de envolverlo en `Number()`.
        expect(formatearImporte("14999.5")).toBe(formatearImporte(14999.5));
    });

    it("el cero se escribe entero, no vacío", () => {
        expect(formatearImporte(0)).toBe("$0.00");
    });

    it("los negativos llevan el signo delante del símbolo", () => {
        expect(formatearImporte(-1234.5)).toBe("-$1,234.50");
    });

    it("`signo` marca los positivos, para las variaciones de precio", () => {
        expect(formatearImporte(12, { signo: true })).toBe("+$12.00");
        expect(formatearImporte(-12, { signo: true })).toBe("-$12.00");
        // Un cambio de 0 no es ni subida ni bajada: no lleva signo.
        expect(formatearImporte(0, { signo: true })).toBe("$0.00");
    });

    it("`decimales: 0` sirve al KPI, sin perder el separador", () => {
        expect(formatearImporte(1234567.89, { decimales: 0 })).toBe("$1,234,568");
    });

    it("un valor no numérico da un hueco visible, no `$NaN`", () => {
        expect(formatearImporte(Number.NaN)).toBe("—");
        expect(formatearImporte("sin precio")).toBe("—");
    });

    it("dos importes de magnitudes distintas comparten formato", () => {
        // El defecto original, escrito como test: precio unitario y valor total de la
        // misma fila tienen que verse igual.
        const precioUnitario = formatearImporte(14999);
        const valorTotal = formatearImporte(1234567.89);
        const forma = (s: string) => s.replace(/\d/g, "#");

        expect(forma(precioUnitario)).toBe("$##,###.##");
        expect(forma(valorTotal)).toBe("$#,###,###.##");
    });
});

describe("Ningún importe se formatea a mano (T2-44)", () => {
    const RAIZ = join(__dirname, "..", "..");

    function archivosTsx(dir: string): string[] {
        return readdirSync(dir).flatMap((entrada) => {
            const ruta = join(dir, entrada);
            if (statSync(ruta).isDirectory()) return entrada === "tests" ? [] : archivosTsx(ruta);
            return ruta.endsWith(".tsx") ? [ruta] : [];
        });
    }

    // Los dos patrones que había antes de esta tarea, tal cual. Buscar cualquier
    // `toFixed` junto a un `$` marcaba también las etiquetas compactas de los ejes
    // (`$${(v / 1000).toFixed(0)}k`), que son deliberadas —un eje que dijera
    // «$1,200,000.00» sería ilegible— y un porcentaje cuyo `$` era el de `${name}`.
    const PATRONES = [
        { nombre: "importe con toFixed(2)", regex: /\$\{?[^\n]*\.toFixed\(2\)\}/ },
        { nombre: "toLocaleString con decimales de moneda", regex: /toLocaleString\("es-MX",\s*\{\s*minimumFractionDigits/ },
    ];

    it("no queda ningún importe formateado a mano", () => {
        const sospechosas: string[] = [];

        for (const archivo of archivosTsx(RAIZ)) {
            readFileSync(archivo, "utf8")
                .split("\n")
                .forEach((linea, i) => {
                    for (const { nombre, regex } of PATRONES) {
                        if (regex.test(linea)) {
                            sospechosas.push(`${archivo.replace(RAIZ, "src")}:${i + 1} [${nombre}] → ${linea.trim()}`);
                        }
                    }
                });
        }

        expect(sospechosas, `Importes formateados a mano:\n${sospechosas.join("\n")}`).toEqual([]);
    });
});
