import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { conSimboloDeMoneda, fijarSimboloDeMoneda, formatearImporte, simboloDeMoneda, suscribirseALaMoneda } from "@/shared/lib/moneda";

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

describe("La moneda del negocio (T6-03)", () => {
    afterEach(() => {
        fijarSimboloDeMoneda("$");
    });

    it("cambiar el símbolo cambia todos los importes, sin tocar a quien los pide", () => {
        fijarSimboloDeMoneda("RD$");

        expect(simboloDeMoneda()).toBe("RD$");
        expect(formatearImporte(14999)).toBe("RD$14,999.00");
        expect(formatearImporte("14999.5")).toBe("RD$14,999.50");
        expect(formatearImporte(-1234.5)).toBe("-RD$1,234.50");
        expect(formatearImporte(12, { signo: true })).toBe("+RD$12.00");
        expect(formatearImporte(1234567.89, { decimales: 0 })).toBe("RD$1,234,568");
        // Sin importe no hay moneda que poner.
        expect(formatearImporte("sin precio")).toBe("—");
    });

    it("las marcas de los ejes, que abrevian y no pasan por `formatearImporte`, también", () => {
        expect(conSimboloDeMoneda("120k")).toBe("$120k");

        fijarSimboloDeMoneda("S/");

        expect(conSimboloDeMoneda("120k")).toBe("S/120k");
        expect(conSimboloDeMoneda(31.5)).toBe("S/31.5");
    });

    it.each(["₡", "", "RD$MXN", "1$", "<b>"])("«%s» no pasa la regla del contrato y deja el símbolo por defecto", (malo) => {
        fijarSimboloDeMoneda("RD$");

        fijarSimboloDeMoneda(malo);

        expect(simboloDeMoneda()).toBe("$");
        expect(formatearImporte(5)).toBe("$5.00");
    });

    it("avisa a quien se suscribe solo cuando cambia de verdad, y deja de avisar al darse de baja", () => {
        const avisar = vi.fn();
        const darseDeBaja = suscribirseALaMoneda(avisar);

        fijarSimboloDeMoneda("RD$");
        fijarSimboloDeMoneda("RD$");
        expect(avisar).toHaveBeenCalledTimes(1);

        darseDeBaja();
        fijarSimboloDeMoneda("S/");
        expect(avisar).toHaveBeenCalledTimes(1);
    });

    it("un importe que redondea a cero no lleva signo", () => {
        expect(formatearImporte(-0.004)).toBe("$0.00");
    });
});

describe("Ningún importe se formatea a mano (T2-44)", () => {
    const RAIZ = join(__dirname, "..", "..");

    function archivosTsx(dir: string): string[] {
        return readdirSync(dir).flatMap((entrada) => {
            const ruta = join(dir, entrada);
            if (statSync(ruta).isDirectory()) return ["tests", "contratos"].includes(entrada) ? [] : archivosTsx(ruta);
            return /\.tsx?$/.test(ruta) ? [ruta] : [];
        });
    }

    // Los dos patrones que había antes de T2-44, tal cual. Buscar cualquier `toFixed` junto a
    // un `$` marcaba también un porcentaje cuyo `$` era el de `${name}`.
    //
    // T6-03 añade el tercero: un `$` literal pegado a una interpolación. Eran las marcas
    // compactas de los ejes (`$120k`), que T2-44 dejó fuera a propósito —un eje que dijera
    // «$1,200,000.00» sería ilegible—. Siguen abreviando, pero el símbolo lo pone
    // `conSimboloDeMoneda`: con la moneda configurable, ese `$` ya no era una abreviatura,
    // era la moneda equivocada. Y se miran también los `.ts`, no solo los componentes.
    const PATRONES = [
        { nombre: "importe con toFixed(2)", regex: /\$\{?[^\n]*\.toFixed\(2\)\}/ },
        { nombre: "toLocaleString con decimales de moneda", regex: /toLocaleString\("es-MX",\s*\{\s*minimumFractionDigits/ },
        { nombre: "símbolo de moneda escrito a mano", regex: /\$\$\{/ },
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
