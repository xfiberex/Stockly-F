import { test, expect } from "@playwright/test";

// Credenciales del entorno de desarrollo (sobreescribibles por variables de entorno).
const EMAIL = process.env.E2E_EMAIL ?? "admin@stockly.app";
const PASSWORD = process.env.E2E_PASSWORD ?? "Admin1234!";

test.describe("Smoke: flujo principal autenticado", () => {
    test("login → dashboard → catálogo → logout", async ({ page }) => {
        // Login
        await page.goto("/auth/login");
        await page.getByLabel("Correo electrónico").fill(EMAIL);
        await page.getByLabel("Contraseña").fill(PASSWORD);
        await page.getByRole("button", { name: "Entrar" }).click();

        // Dashboard cargado
        await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
        await expect(page.getByText("Valor total del inventario activo")).toBeVisible();

        // Navegar al catálogo de productos (dropdown Catálogo → Productos)
        await page.getByRole("button", { name: "Catálogo" }).click();
        await page.getByRole("link", { name: "Productos" }).click();
        await expect(page.getByRole("heading", { name: "Productos", level: 1 })).toBeVisible();
        await expect(page.getByText(/productos en total/)).toBeVisible();

        // Logout
        await page.getByRole("button", { name: "Menú de usuario" }).click();
        await page.getByRole("button", { name: "Cerrar sesión" }).click();
        await expect(page).toHaveURL(/\/auth\/login/);
        await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    });

    test("una ruta protegida redirige a login sin sesión", async ({ page }) => {
        await page.goto("/reports");
        await expect(page).toHaveURL(/\/auth\/login/);
    });
});
