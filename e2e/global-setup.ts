import { execFileSync, execSync } from "node:child_process";
import { createConnection } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// T1-24: deja la base de datos lista antes de que Playwright arranque los servidores,
// para que `pnpm test:e2e` funcione desde un checkout limpio sin pasos manuales.
// Playwright levanta backend y frontend (ver `webServer` en playwright.config.ts).

// El proyecto es ESM ("type": "module"), así que no hay `__dirname`.
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(AQUI, "../../Stockly-B");

// El .env del backend no está en git; se lee a mano para no añadir dotenv al frontend.
function leerDatabaseUrl(): string | undefined {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    const envPath = path.join(BACKEND, ".env");
    if (!existsSync(envPath)) return undefined;

    const linea = readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .find((l) => l.trim().startsWith("DATABASE_URL="));

    return linea?.slice(linea.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

function puertoAbierto(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = createConnection({ host, port });
        const cerrar = (abierto: boolean) => {
            socket.destroy();
            resolve(abierto);
        };
        socket.setTimeout(timeoutMs);
        socket.once("connect", () => cerrar(true));
        socket.once("timeout", () => cerrar(false));
        socket.once("error", () => cerrar(false));
    });
}

function hayDocker(): boolean {
    try {
        execSync("docker info", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

function pnpm(args: string[]): void {
    execFileSync("pnpm", args, { cwd: BACKEND, stdio: "inherit", shell: process.platform === "win32" });
}

async function globalSetup(): Promise<void> {
    const databaseUrl = leerDatabaseUrl();
    if (!databaseUrl) {
        throw new Error(
            `No se encontró DATABASE_URL. Crea ${path.join(BACKEND, ".env")} a partir de .env.example antes de lanzar el E2E.`,
        );
    }

    const { hostname, port } = new URL(databaseUrl);
    const puerto = Number(port || 5432);

    if (!(await puertoAbierto(hostname, puerto))) {
        // Cualquier PostgreSQL sirve; solo se recurre a Docker si no hay ninguno escuchando.
        if (!hayDocker()) {
            throw new Error(
                `PostgreSQL no responde en ${hostname}:${puerto} y Docker no está disponible. Levanta la base de datos o ajusta DATABASE_URL en Stockly-B/.env.`,
            );
        }
        console.log("▸ Levantando la base de datos con Docker…");
        execFileSync("docker", ["compose", "up", "-d", "db"], { cwd: BACKEND, stdio: "inherit" });

        const limite = Date.now() + 60_000;
        while (!(await puertoAbierto(hostname, puerto))) {
            if (Date.now() > limite) throw new Error("La base de datos no aceptó conexiones en 60 s.");
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    console.log("▸ Aplicando migraciones…");
    pnpm(["exec", "prisma", "migrate", "deploy"]);

    // El seed crea el administrador que usan las pruebas: desde T1-22 el registro
    // público solo genera usuarios USER, así que sin seed no hay con quién entrar.
    console.log("▸ Sembrando datos de ejemplo…");
    pnpm(["db:seed"]);
}

export default globalSetup;
