// Análisis de composición: vulnerabilidades y licencias de las dependencias de producción.
//
// Hermano de `Stockly-B/scripts/auditoria.js` (T4-07), con la misma lógica y **una lista de
// licencias distinta**, que es justo el motivo de que sean dos archivos y no uno copiado:
// el árbol del navegador trae MPL-2.0 y OFL-1.1, que en el backend no aparecen, y el
// backend trae EPL-2.0, que aquí no. Una lista común sería la unión de las dos y dejaría
// pasar en un repositorio lo que solo se revisó para el otro.
//
// Las dos comprobaciones se tratan distinto a propósito:
//
//   1. **Vulnerabilidades** (`pnpm audit`). Necesita red. Sin conexión avisa y deja pasar:
//      «no se puede saber» no es «hay un problema», y este proyecto no tiene CI (decisión
//      del 2026-08-06), así que `verify` corre en portátiles. Con `--estricto`, «no pude
//      auditar» pasa a ser fallo — esa es la forma de usarlo antes de publicar.
//   2. **Licencias**. Salen del lockfile, sin red. Puerta dura: una dependencia nueva con
//      una licencia que no está en la lista para el gate hasta que alguien la mire.
//
// **La trampa:** `pnpm audit --json` con el registro caído puede seguir imprimiendo un
// informe con las cinco severidades a cero. La auditoría que no se hizo se lee igual que la
// que salió limpia. Lo que separa los dos casos es la clave `error` del JSON, no el código
// de salida.

// Módulos ES y no `require`, al revés que su hermano del backend: este repositorio declara
// `"type": "module"`, así que un `.js` con `require` ni siquiera arranca.
import { spawnSync } from "node:child_process";
import process from "node:process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

export const SEVERIDADES_QUE_BLOQUEAN = ["high", "critical"];

// Sin GPL, LGPL, AGPL ni SSPL: en una dependencia de producción de una SPA —que se sirve
// entera al navegador— eso es una decisión sobre la licencia del producto, no un detalle de
// instalación.
export const LICENCIAS_PERMITIDAS = [
    "MIT",
    "MIT-0",
    "ISC",
    "MIT AND ISC",
    "MIT and ISC",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "0BSD",
    "Unlicense",
    // Copyleft **por archivo**: obliga al modificar los archivos de la biblioteca, no al
    // depender de ella. Llega por `lightningcss`, dentro de la cadena de Tailwind/Vite, y
    // es una herramienta de compilación: su código no viaja en el paquete final.
    "MPL-2.0",
    // Licencia de tipografía (`@fontsource/inter`). **Sí trae una obligación real que se
    // cumple**: los `.woff2` de Inter se copian a `dist/`, así que la aplicación distribuye
    // la fuente y tiene que acompañarla de su aviso de licencia. Ver `docs/dependencias.md`.
    "OFL-1.1",
];

/**
 * Decide si el recuento de vulnerabilidades debe romper la compilación.
 *
 * Separada para poder probarla: sin una vulnerabilidad real en el árbol no hay forma de ver
 * la puerta en rojo, y una puerta que nunca se ha visto fallar no está demostrada.
 */
export function evaluarVulnerabilidades(informe) {
    if (!informe || informe.error) {
        return { estado: "indeterminado", motivo: informe?.error?.message ?? "sin informe" };
    }

    const recuento = informe.metadata?.vulnerabilities;
    if (!recuento) return { estado: "indeterminado", motivo: "el informe no trae recuento" };

    const bloqueantes = SEVERIDADES_QUE_BLOQUEAN.reduce((total, s) => total + (recuento[s] ?? 0), 0);

    return { estado: bloqueantes > 0 ? "fallo" : "correcto", bloqueantes, recuento };
}

/**
 * Devuelve las licencias del árbol que no están en la lista, con los paquetes que las traen.
 */
export function evaluarLicencias(listado, permitidas = LICENCIAS_PERMITIDAS) {
    const admitidas = new Set(permitidas.map((l) => l.toUpperCase()));

    const desconocidas = Object.entries(listado ?? {})
        .filter(([licencia]) => !admitidas.has(licencia.toUpperCase()))
        .map(([licencia, paquetes]) => ({
            licencia,
            paquetes: (paquetes ?? []).map((p) => p.name),
        }));

    return { estado: desconocidas.length > 0 ? "fallo" : "correcto", desconocidas };
}

function ejecutarPnpm(argumentos) {
    // Comando entero en una cadena y `shell: true`. Hace falta shell —en Windows `pnpm` es
    // un `.cmd`, y Node se niega a lanzarlo directamente desde que se cerró CVE-2024-27980—
    // y **la cadena única evita el aviso DEP0190**, que salta al mezclar shell con un array
    // de argumentos porque se concatenan sin escapar. Aquí no hay entrada de nadie: los
    // argumentos son literales de este archivo.
    const resultado = spawnSync(`pnpm ${argumentos.join(" ")}`, { shell: true, encoding: "utf8" });

    try {
        return JSON.parse(resultado.stdout);
    } catch {
        return { error: { message: (resultado.stderr || "").trim() || "pnpm no devolvió JSON" } };
    }
}

/**
 * Arma el aviso de terceros a partir del listado de licencias.
 *
 * **No es cosmética: es la obligación que esta auditoría encontró sin cumplir.** La OFL-1.1
 * de Inter y la propia MIT —«this permission notice shall be included in all copies or
 * substantial portions»— piden que el aviso viaje con lo que se distribuye, y lo que se
 * distribuye aquí es `dist/`: el paquete de JavaScript y los `.woff2` de la tipografía. El
 * archivo se escribe en `public/`, que Vite copia tal cual, así que acaba servido junto a
 * la aplicación en vez de quedarse en el repositorio.
 *
 * Se genera y no se escribe a mano por el motivo de siempre: una lista de 118 paquetes
 * copiada a mano está desactualizada desde la siguiente instalación.
 */
export function componerAvisos(listado, leerLicencia) {
    const paquetes = Object.entries(listado)
        .flatMap(([licencia, lista]) => lista.map((p) => ({ ...p, licencia })))
        .sort((a, b) => a.name.localeCompare(b.name));

    const bloques = paquetes.map((p) => {
        const texto = leerLicencia(p.paths?.[0]);
        const cabecera = `${p.name} ${(p.versions ?? []).join(", ")} — ${p.licencia}`;

        return [
            cabecera,
            "-".repeat(cabecera.length),
            p.homepage ? `${p.homepage}\n` : "",
            // Sin archivo de licencia queda constancia del identificador, que es lo que hay:
            // inventar el texto sería peor que decir que no viene incluido.
            texto ?? `(el paquete no incluye el texto de la licencia; identificador: ${p.licencia})`,
        ].join("\n");
    });

    return [
        "AVISOS DE TERCEROS",
        "",
        "Esta aplicación incorpora software de terceros. A continuación, sus licencias.",
        `Generado por scripts/auditoria.js --informe a partir de las ${paquetes.length} dependencias de producción.`,
        "",
        "=".repeat(78),
        "",
        bloques.join(`\n\n${"=".repeat(78)}\n\n`),
        "",
    ].join("\n");
}

function generarInforme(listado) {
    const leer = (ruta) => {
        if (!ruta) return null;
        for (const nombre of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "license"]) {
            const candidato = join(ruta, nombre);
            if (existsSync(candidato)) return readFileSync(candidato, "utf8").trim();
        }
        return null;
    };

    const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "AVISOS-DE-TERCEROS.txt");
    writeFileSync(destino, componerAvisos(listado, leer), "utf8");

    console.log(`✓ aviso de terceros escrito en public/AVISOS-DE-TERCEROS.txt`);
}

export function main() {
    const estricto = process.argv.includes("--estricto");
    const informe = process.argv.includes("--informe");
    let codigo = 0;

    const vulnerabilidades = evaluarVulnerabilidades(ejecutarPnpm(["audit", "--prod", "--json"]));

    if (vulnerabilidades.estado === "indeterminado") {
        console.log(`⚠ no se pudo auditar (${vulnerabilidades.motivo})`);
        if (estricto) {
            console.log("  --estricto: se trata como fallo");
            codigo = 1;
        }
    } else {
        const { info, low, moderate, high, critical } = vulnerabilidades.recuento;
        const resumen = `crítica ${critical}, alta ${high}, moderada ${moderate}, baja ${low}, info ${info}`;

        if (vulnerabilidades.estado === "fallo") {
            console.log(`✗ ${vulnerabilidades.bloqueantes} vulnerabilidad(es) alta o superior — ${resumen}`);
            console.log("  detalle: pnpm audit --prod");
            codigo = 1;
        } else {
            console.log(`✓ sin vulnerabilidades altas ni críticas — ${resumen}`);
        }
    }

    const listado = ejecutarPnpm(["licenses", "list", "--prod", "--json"]);

    if (listado.error) {
        console.log(`✗ no se pudo listar licencias (${listado.error.message})`);
        codigo = 1;
    } else {
        const licencias = evaluarLicencias(listado);

        if (licencias.estado === "fallo") {
            console.log("✗ licencias fuera de la lista permitida:");
            for (const { licencia, paquetes } of licencias.desconocidas) {
                console.log(`    ${licencia} → ${paquetes.join(", ")}`);
            }
            console.log("  si es aceptable, añádela a LICENCIAS_PERMITIDAS en scripts/auditoria.js");
            codigo = 1;
        } else {
            const total = Object.values(listado).reduce((n, p) => n + p.length, 0);
            console.log(`✓ ${total} paquetes de producción, ${Object.keys(listado).length} licencias, todas permitidas`);
        }

        if (informe) generarInforme(listado);
    }

    process.exitCode = codigo;
}

// Solo se ejecuta si se invoca el archivo; importarlo desde un test no dispara nada.
// `pathToFileURL` y no un `file://` a mano: la ruta del proyecto tiene espacios, y sin
// codificar no coincidiría nunca con `import.meta.url`.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
