import { defineConfig, devices } from "@playwright/test";

// Smoke E2E contra la app en ejecución (frontend 5173 + backend 3000).
// Requiere ambos servidores levantados. `reuseExistingServer` reutiliza el
// dev server si ya está corriendo; si no, lo arranca.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: "list",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ],
    webServer: {
        command: "pnpm dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
    },
});
