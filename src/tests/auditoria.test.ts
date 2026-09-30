// @ts-expect-error — `scripts/` es utillaje en JS plano, sin tipos y fuera de `src`.
import { evaluarVulnerabilidades, evaluarLicencias, LICENCIAS_PERMITIDAS, componerAvisos, EMBEBIDOS } from "../../scripts/auditoria.js";

/**
 * Gemelo de `Stockly-B/src/tests/auditoria.test.ts`. El criterio de T4-07 dice que la
 * verificación local **falla** ante una vulnerabilidad alta o superior en dependencias de
 * producción; hoy el árbol está limpio, así que ejecutar el guion no prueba nada —sale
 * verde tanto si la puerta funciona como si no mira nada—. Estos tests son la prueba, con
 * informes fabricados.
 */
describe("auditoría de dependencias (T4-07)", () => {
    const recuento = (parcial: Record<string, number>) => ({
        metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, ...parcial } },
    });

    describe("vulnerabilidades", () => {
        it("una alta rompe la compilación", () => {
            expect(evaluarVulnerabilidades(recuento({ high: 1 })).estado).toBe("fallo");
        });

        it("una crítica rompe la compilación", () => {
            expect(evaluarVulnerabilidades(recuento({ critical: 1 })).estado).toBe("fallo");
        });

        it("moderadas y bajas se informan pero no bloquean", () => {
            const resultado = evaluarVulnerabilidades(recuento({ moderate: 3, low: 7 }));

            expect(resultado.estado).toBe("correcto");
            expect(resultado.bloqueantes).toBe(0);
        });

        // `pnpm audit --json` sin registro puede devolver un informe con todo a cero: la
        // auditoría que no se hizo se lee igual que la limpia.
        it("no confunde «no se pudo auditar» con «no hay vulnerabilidades»", () => {
            expect(evaluarVulnerabilidades({ error: { message: "fetch failed" } }).estado)
                .toBe("indeterminado");
            expect(evaluarVulnerabilidades({}).estado).toBe("indeterminado");
        });
    });

    describe("licencias", () => {
        it("una GPL en producción para el gate", () => {
            const resultado = evaluarLicencias({ "GPL-3.0": [{ name: "biblioteca-viral" }] });

            expect(resultado.estado).toBe("fallo");
            expect(resultado.desconocidas[0].paquetes).toContain("biblioteca-viral");
        });

        it("también AGPL y SSPL", () => {
            for (const licencia of ["AGPL-3.0", "SSPL-1.0", "LGPL-2.1"]) {
                expect(evaluarLicencias({ [licencia]: [{ name: "x" }] }).estado).toBe("fallo");
            }
        });

        it("el árbol permitido pasa entero", () => {
            const listado = Object.fromEntries(LICENCIAS_PERMITIDAS.map((l: string) => [l, [{ name: "x" }]]));

            expect(evaluarLicencias(listado).estado).toBe("correcto");
        });

        // La del navegador sí trae una obligación que se cumple: los `.woff2` de Inter se
        // copian a `dist/`, así que la aplicación distribuye la fuente. Ver
        // `Stockly-B/docs/dependencias.md`.
        it("OFL-1.1 está admitida porque la tipografía se distribuye con su aviso", () => {
            expect(evaluarLicencias({ "OFL-1.1": [{ name: "@fontsource/inter" }] }).estado)
                .toBe("correcto");
        });
    });

    describe("aviso de terceros", () => {
        // T5-08 — ZXing-C++ no es un paquete de npm: va compilado dentro del `.wasm` de
        // `zxing-wasm`, que declara MIT. Su Apache-2.0 solo llega al aviso si se nombra a mano.
        it("incluye lo que viaja dentro de un paquete, con su propia licencia y su texto", () => {
            const aviso: string = componerAvisos(
                { MIT: [{ name: "zxing-wasm", versions: ["3.1.3"], paths: ["x"] }] },
                () => "texto MIT",
                EMBEBIDOS,
                (archivo: string) => `texto de ${archivo}`,
            );

            expect(aviso).toContain("zxing-wasm 3.1.3 — MIT");
            expect(aviso).toContain("zxing-cpp (compilado en el .wasm de zxing-wasm) — Apache-2.0");
            expect(aviso).toContain("texto de Apache-2.0.txt");
            expect(aviso).toContain("a partir de las 1 dependencias de producción y de 1 componente(s)");
        });
    });
});
