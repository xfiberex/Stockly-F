import { expect, type Page } from "@playwright/test";

// Credenciales del seed (`Stockly-B/prisma/seed.ts`), sobreescribibles por entorno.
// Nunca poner aquí una contraseña real: este archivo está versionado.
export const EMAIL = process.env.E2E_EMAIL ?? "admin@stockly.app";
export const PASSWORD = process.env.E2E_PASSWORD ?? "Admin1234!";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";

export async function login(page: Page): Promise<void> {
    await page.goto("/auth/login");
    await page.getByLabel("Correo electrónico").fill(EMAIL);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

/** Sufijo único para que los datos de una ejecución no choquen con los de otra. */
export function sufijo(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Llama a la API con la sesión del navegador. `page.request` comparte cookies con
 * la página, así que solo hay que reenviar el token CSRF de la cookie en la cabecera
 * (patrón double-submit).
 */
export async function api(
    page: Page,
    metodo: "get" | "post" | "patch" | "delete",
    ruta: string,
    data?: unknown,
): Promise<unknown> {
    const cookies = await page.context().cookies();
    const csrf = cookies.find((c) => c.name === "csrfToken")?.value ?? "";

    const res = await page.request[metodo](`${API_URL}/api/v1${ruta}`, {
        headers: { "x-csrf-token": csrf, "Content-Type": "application/json" },
        ...(data !== undefined && { data }),
    });

    if (!res.ok()) {
        throw new Error(`${metodo.toUpperCase()} ${ruta} → ${res.status()} ${await res.text()}`);
    }
    return (await res.json()).data;
}

/** Stock actual de un producto, leído de la API. */
export async function stockDe(page: Page, productId: string): Promise<number> {
    const producto = (await api(page, "get", `/products/${productId}`)) as { stock: number };
    return producto.stock;
}
