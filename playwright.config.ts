import { defineConfig, devices } from "@playwright/test";

// E2E contra la aplicación completa. Desde T1-24 no hace falta levantar nada a mano:
// `globalSetup` prepara la base de datos (migraciones + seed) y `webServer` arranca
// backend y frontend, reutilizando los que ya estén corriendo.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";
const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    // Ejecución siempre local: sin CI que rechace `.only` ni reintentos automáticos.
    forbidOnly: false,
    retries: 0,
    reporter: "list",
    globalSetup: "./e2e/global-setup.ts",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
        /*
         * T4-04 — el navegador de las pruebas habla español.
         *
         * Playwright arranca Chromium en `en-US`, y desde que la interfaz sigue el idioma del
         * navegador eso bastaba para que estas pruebas buscaran «Iniciar sesión» en una página
         * que decía «Sign in». No es un apaño: la suite comprueba *una* interfaz concreta, y
         * cuál sea no puede depender del idioma que traiga el navegador de turno. Lo mismo hace
         * `src/tests/setup.ts` con jsdom.
         */
        locale: "es-ES",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        // Cubre de paso los hallazgos responsive: la navegación móvil es otro árbol.
        { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
    ],
    webServer: [
        {
            command: "pnpm dev",
            cwd: "../Stockly-B",
            url: `${API_URL}/api/v1/health`,
            reuseExistingServer: true,
            timeout: 120_000,
            // Una pasada del navegador supera de largo las 100 peticiones/15 min del
            // límite por defecto: el 429 hacía fallar pruebas que no van de eso.
            // Se sube el techo en lugar de desactivarlo, y CSRF sigue activo.
            env: { RATE_LIMIT_MAX: "100000", AUTH_RATE_LIMIT_MAX: "1000" },
        },
        {
            command: "pnpm dev",
            url: BASE_URL,
            reuseExistingServer: true,
            timeout: 60_000,
        },
    ],
});
