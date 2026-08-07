import { test, expect } from "@playwright/test";
import { api, login, stockDe, sufijo } from "./helpers";

// T1-23: los tres defectos funcionales de la auditoría (T0-03, T1-03 y T1-05) no
// produjeron ni un fallo entre 379 tests, porque cada repositorio se probaba contra su
// propia suposición del contrato. Estos escenarios cruzan la frontera: pasan por la
// interfaz real y comprueban el efecto en el backend real.

test.describe("Flujos que cruzan frontend y backend", () => {
    test("el interruptor de configuración sigue activo tras recargar (T1-05, T1-07)", async ({ page }, testInfo) => {
        // `AppSetting` es estado global compartido: si escritorio y móvil lo alternan a
        // la vez, cada uno lee el cambio del otro. Se comprueba en un solo proyecto,
        // porque lo que se prueba es la persistencia, no el diseño responsive.
        test.skip(testInfo.project.name !== "chromium", "estado global compartido entre proyectos");

        await login(page);
        await page.goto("/settings");

        const interruptor = page.getByRole("switch").first();
        await expect(interruptor).toBeVisible();
        const inicial = await interruptor.getAttribute("aria-checked");
        const esperado = inicial === "true" ? "false" : "true";

        await interruptor.click();
        await page.getByRole("button", { name: "Guardar cambios" }).click();
        // El botón vuelve a deshabilitarse cuando el guardado se confirma.
        await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

        await page.reload();
        // Antes de T1-05 el PATCH devolvía 200 sin persistir nada: al recargar,
        // el interruptor volvía a su posición anterior.
        await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", esperado);

        // Se deja como estaba para no arrastrar estado entre ejecuciones.
        await page.getByRole("switch").first().click();
        await page.getByRole("button", { name: "Guardar cambios" }).click();
        await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
    });

    test("un producto creado con etiqueta la conserva y aparece en el filtro (T1-03, T1-04)", async ({ page }) => {
        await login(page);
        const id = sufijo();
        const etiqueta = `E2E-tag-${id}`;
        const producto = `E2E-prod-${id}`;

        // 1. Crear la etiqueta
        await page.goto("/catalog/tags");
        await page.getByRole("button", { name: "Nueva etiqueta" }).click();
        await page.getByLabel("Nombre *").fill(etiqueta);
        await page.getByRole("button", { name: /Crear|Guardar/ }).click();
        await expect(page.getByText(etiqueta)).toBeVisible();

        // 2. Crear un producto con esa etiqueta seleccionada
        await page.goto("/catalog/products");
        await page.getByRole("button", { name: "Nuevo producto" }).click();
        const dialogo = page.getByRole("dialog");
        await dialogo.getByLabel("Nombre *").fill(producto);
        await dialogo.getByLabel("Precio *").fill("99");
        await dialogo.getByLabel("Stock inicial").fill("10");
        await dialogo.getByRole("button", { name: etiqueta }).click();
        await dialogo.getByRole("button", { name: "Crear producto" }).click();
        await expect(dialogo).toBeHidden();
        await expect(page.getByText(producto)).toBeVisible();

        // 3. La etiqueta llegó al backend: antes de T1-03 el validador la descartaba
        //    en silencio y el producto se creaba sin ninguna.
        const listado = (await api(page, "get", `/products?search=${encodeURIComponent(producto)}`)) as {
            data: Array<{ id: string; tags: Array<{ name: string }> }>;
        };
        const creado = listado.data[0];
        expect(creado.tags.map((t) => t.name)).toContain(etiqueta);

        // 4. El filtro por etiqueta de la interfaz lo encuentra
        const selectorEtiquetas = page
            .locator("select")
            .filter({ has: page.getByRole("option", { name: "Todas las etiquetas" }) });
        await selectorEtiquetas.selectOption({ label: etiqueta });
        await expect(page.getByText(producto)).toBeVisible();

        await api(page, "delete", `/products/${creado.id}`);
    });

    test("cancelar una venta enviada devuelve el stock (T0-03)", async ({ page }) => {
        await login(page);
        const id = sufijo();
        const producto = `E2E-venta-${id}`;
        const STOCK_INICIAL = 20;
        const CANTIDAD = 3;

        // Producto de partida, creado por la interfaz.
        await page.goto("/catalog/products");
        await page.getByRole("button", { name: "Nuevo producto" }).click();
        const formulario = page.getByRole("dialog");
        await formulario.getByLabel("Nombre *").fill(producto);
        await formulario.getByLabel("Precio *").fill("50");
        await formulario.getByLabel("Stock inicial").fill(String(STOCK_INICIAL));
        await formulario.getByRole("button", { name: "Crear producto" }).click();
        await expect(formulario).toBeHidden();

        const listado = (await api(page, "get", `/products?search=${encodeURIComponent(producto)}`)) as {
            data: Array<{ id: string }>;
        };
        const productId = listado.data[0].id;
        expect(await stockDe(page, productId)).toBe(STOCK_INICIAL);

        // Orden de venta por la interfaz.
        await page.goto("/sale-orders");
        await page.getByRole("button", { name: "Nueva orden" }).click();
        const modal = page.getByRole("dialog");
        await modal.getByLabel("Nombre del cliente").fill(`Cliente ${id}`);
        // El formulario abre con una fila de ítem ya puesta.
        await modal.getByLabel("Producto").first().selectOption({ label: producto });
        await modal.getByLabel("Cant.").first().fill(String(CANTIDAD));
        await modal.getByRole("button", { name: "Crear orden" }).click();
        await expect(modal).toBeHidden();

        // Enviar descuenta el stock.
        await page.getByTitle("Marcar como enviado").first().click();
        await expect.poll(() => stockDe(page, productId)).toBe(STOCK_INICIAL - CANTIDAD);

        // La interfaz solo ofrece cancelar mientras la orden está PENDIENTE, así que la
        // cancelación de una orden ya enviada —el caso que arregló T0-03— se hace por API.
        const ordenes = (await api(page, "get", "/sale-orders?limit=100")) as {
            data: Array<{ id: string; status: string; items: Array<{ productId: string | null }> }>;
        };
        const orden = ordenes.data.find(
            (o) => o.status === "SHIPPED" && o.items.some((i) => i.productId === productId),
        );
        expect(orden, "la orden enviada debería existir").toBeTruthy();

        await api(page, "patch", `/sale-orders/${orden!.id}`, { status: "CANCELLED" });

        // Antes de T0-03, cancelar una venta ya enviada no reponía nada.
        expect(await stockDe(page, productId)).toBe(STOCK_INICIAL);

        await api(page, "delete", `/products/${productId}`);
    });
});
