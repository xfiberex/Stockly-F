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
        await page.getByLabel("Contraseña").fill(PASSWORD);
        await page.getByRole("button", { name: "Entrar" }).click();

        // Dashboard cargado
        await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
        await expect(page.getByText("Valor total del inventario activo")).toBeVisible();

        // Navegar al catálogo de productos
        if (esMovil(viewport?.width)) {
            await page.getByRole("button", { name: "Abrir menú de navegación" }).click();
            const menu = page.locator("#mobile-menu");
            await menu.getByRole("link", { name: "Productos", exact: true }).click();
        } else {
            await page.getByRole("button", { name: "Catálogo" }).click();
            await page.getByRole("link", { name: "Productos", exact: true }).click();
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
