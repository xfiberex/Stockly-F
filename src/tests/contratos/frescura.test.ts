import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * T4-01 — la copia del contrato que consume esta aplicación no puede quedarse atrás.
 *
 * `src/shared/contratos/api.generated.ts` es una copia literal de
 * `Stockly-B/src/contratos/api.ts`, que es la fuente de verdad. Si alguien cambia la forma
 * de una respuesta en el backend y no ejecuta `pnpm contratos:generar`, este test lo dice.
 *
 * ## Por qué la comprobación puede omitirse
 *
 * Necesita el repositorio hermano en disco. Los dos se clonan uno al lado del otro —lo
 * dicen el README, `CONTRIBUTING` y el `docker-compose`, que ya cruza a `../Stockly-F`—,
 * así que en la práctica está siempre; pero clonar solo el frontend es legítimo y no debe
 * dejar la suite en rojo por algo que ahí no se puede saber. En ese caso se omite **con el
 * motivo escrito**, en vez de pasar en silencio y aparentar una garantía que no hubo.
 *
 * El backend tiene la comprobación simétrica en `src/tests/contratos.test.ts`, y allí no
 * se omite nunca: es donde se edita el contrato, así que es donde importa que falle.
 *
 * ## Por qué se carga el generador en vez de repetir su lógica
 *
 * El formato de la cabecera lo define `generar-contratos.js`. Recalcularlo aquí a mano
 * sería una segunda definición del mismo formato, con dos sitios que mantener sincronizados
 * — exactamente el problema que esta tarea viene a resolver.
 */

const RAIZ = process.cwd();
const BACKEND = path.resolve(RAIZ, "..", "Stockly-B");
const FUENTE = path.join(BACKEND, "src", "contratos", "api.ts");
const GENERADOR = path.join(BACKEND, "scripts", "generar-contratos.js");
const COPIA = path.join(RAIZ, "src", "shared", "contratos", "api.generated.ts");

const hayBackend = existsSync(FUENTE) && existsSync(GENERADOR);

describe("Frescura del contrato (T4-01)", () => {
    it("la copia existe y declara que es generada", () => {
        expect(existsSync(COPIA)).toBe(true);

        const copia = readFileSync(COPIA, "utf8");
        expect(copia).toMatch(/ARCHIVO GENERADO — NO EDITAR A MANO/);
        expect(copia).toMatch(/^\/\/ huella: [0-9a-f]{16}$/m);
    });

    it.skipIf(!hayBackend)("coincide con la fuente del backend byte a byte", () => {
        const requerir = createRequire(import.meta.url);
        const { contenidoGenerado } = requerir(GENERADOR);

        const esperado = contenidoGenerado(readFileSync(FUENTE, "utf8"));
        const actual = readFileSync(COPIA, "utf8").replace(/\r\n/g, "\n");

        // El mensaje importa más que el booleano: un `false` aquí no dice qué hacer.
        expect(actual === esperado ? "al día" : "desfasada — ejecuta `pnpm contratos:generar` en Stockly-B").toBe(
            "al día",
        );
    });

    it.skipIf(hayBackend)("sin el repositorio hermano, la comprobación se omite a propósito", () => {
        // Este caso solo existe para que la omisión quede escrita en la salida de la suite
        // en lugar de desaparecer. Si estás leyendo esto en un fallo: clona `Stockly-B`
        // al lado de este repositorio.
        expect(hayBackend).toBe(false);
    });
});
