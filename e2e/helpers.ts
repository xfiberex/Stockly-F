import { expect, type Page } from "@playwright/test";

// Credenciales del seed (`Stockly-B/prisma/seed.ts`), sobreescribibles por entorno.
// Nunca poner aquí una contraseña real: este archivo está versionado.
export const EMAIL = process.env.E2E_EMAIL ?? "admin@stockly.app";
export const PASSWORD = process.env.E2E_PASSWORD ?? "Admin1234!";

// T5-13 — la cuenta de almacén del seed.
export const ALMACEN = {
    email: process.env.E2E_ALMACEN_EMAIL ?? "almacen@stockly.app",
    password: process.env.E2E_ALMACEN_PASSWORD ?? "Almacen1234!",
};

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:3000";

export async function login(page: Page, cuenta = { email: EMAIL, password: PASSWORD }): Promise<void> {
    await page.goto("/auth/login");
    await page.getByLabel("Correo electrónico").fill(cuenta.email);
    await page.getByLabel("Contraseña").fill(cuenta.password);
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
    metodo: "get" | "post" | "put" | "patch" | "delete",
    ruta: string,
    data?: unknown,
): Promise<unknown> {
    const res = await apiCruda(page, metodo, ruta, data);

    if (!res.ok()) {
        throw new Error(`${metodo.toUpperCase()} ${ruta} → ${res.status()} ${await res.text()}`);
    }
    return (await res.json()).data;
}

/** Como `api`, pero devuelve la respuesta tal cual: para comprobar un rechazo (T5-13). */
export async function apiCruda(
    page: Page,
    metodo: "get" | "post" | "put" | "patch" | "delete",
    ruta: string,
    data?: unknown,
) {
    const cookies = await page.context().cookies();
    const csrf = cookies.find((c) => c.name === "csrfToken")?.value ?? "";

    return page.request[metodo](`${API_URL}/api/v1${ruta}`, {
        // `Connection: close` — cada llamada, su conexión. `page.request` las reutiliza, y Node
        // cierra las que llevan unos 6 s paradas: una llamada que salía justo entonces moría con
        // `read ECONNRESET`, en el escenario que tocara. Medido el 2026-10-08: 1 de 180 con la
        // conexión reutilizada a los 6 s, 0 de 60 con esta cabecera (CONTEXTO.md §4).
        headers: { "x-csrf-token": csrf, "Content-Type": "application/json", Connection: "close" },
        ...(data !== undefined && { data }),
    });
}

/** Stock actual de un producto, leído de la API. */
export async function stockDe(page: Page, productId: string): Promise<number> {
    const producto = (await api(page, "get", `/products/${productId}`)) as { stock: number };
    return producto.stock;
}
