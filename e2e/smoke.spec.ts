import { test, expect } from "@playwright/test";
import { EMAIL, PASSWORD } from "./helpers";

// La navegación de escritorio y la móvil son dos árboles distintos (`lg:` en Tailwind),
// así que cada una se prueba en su proyecto: `chromium` y `Mobile Chrome`.
const esMovil = (anchura: number | undefined) => (anchura ?? 1280) < 1024;

test.describe("Smoke: flujo principal autenticado", () => {
    test("login → dashboard → catálogo → logout", async ({ page, viewport }) => {
        // Login
        await page.goto("/auth/login");
        await page.getByLabel("Correo electrónico").fill(EMAIL);
        await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
        await page.getByRole("button", { name: "Entrar" }).click();

        // Panel cargado
        await expect(page.getByRole("heading", { name: "Panel", level: 1 })).toBeVisible();
        await expect(page.getByText("Valor a precio de venta")).toBeVisible(); // T5-02 partió la tarjeta de valor en coste y venta

        // Navegar al catálogo de productos. Desde el 2026-11-15 los grupos del menú empiezan
        // plegados (revisa T4-10): primero se abre Catálogo, en el panel móvil o en la barra.
        if (esMovil(viewport?.width)) {
            await page.getByRole("button", { name: "Abrir menú de navegación" }).click();
            const menu = page.locator("#mobile-menu");
            await menu.getByRole("button", { name: "Catálogo" }).click();
            await menu.getByRole("link", { name: "Productos", exact: true }).click();
        } else {
            const lateral = page.getByRole("navigation", { name: "Secciones" });
            await lateral.getByRole("button", { name: "Catálogo" }).click();
            await lateral.getByRole("link", { name: "Productos", exact: true }).click();
        }
        await expect(page.getByRole("heading", { name: "Productos", level: 1 })).toBeVisible();
        await expect(page.getByText(/productos en total/)).toBeVisible();

        // Logout
        await page.getByRole("button", { name: "Menú de usuario" }).click();
        await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
        await expect(page).toHaveURL(/\/auth\/login/);
        await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    });

    test("una ruta protegida redirige a login sin sesión", async ({ page }) => {
        await page.goto("/reports");
        await expect(page).toHaveURL(/\/auth\/login/);
    });
});
