import { test, expect, type Page } from "@playwright/test";
import { ALMACEN, api, apiCruda, login, stockDe, sufijo } from "./helpers";

// T1-23: los tres defectos funcionales de la auditoría (T0-03, T1-03 y T1-05) no
// produjeron ni un fallo entre 379 tests, porque cada repositorio se probaba contra su
// propia suposición del contrato. Estos escenarios cruzan la frontera: pasan por la
// interfaz real y comprueban el efecto en el backend real.

/**
 * Guarda la configuración y espera a la **respuesta del PATCH**, no al estado del
 * botón: «Guardar cambios» también se deshabilita mientras la petición está en
 * vuelo (`isLoading`), así que esperar a que se deshabilite podía dar por bueno un
 * guardado a medias y recargar antes de que se persistiera. Era una prueba
 * intermitente, no un fallo de la aplicación.
 */
async function guardarAjustes(page: Page): Promise<void> {
    const respuesta = page.waitForResponse(
        (r) => r.url().includes("/api/v1/settings") && r.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    expect((await respuesta).status()).toBe(200);
}

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
        await guardarAjustes(page);

        await page.reload();
        // Antes de T1-05 el PATCH devolvía 200 sin persistir nada: al recargar,
        // el interruptor volvía a su posición anterior.
        await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", esperado);

        // Se deja como estaba para no arrastrar estado entre ejecuciones.
        await page.getByRole("switch").first().click();
        await guardarAjustes(page);
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

        // Se localiza **esta** orden por su número, no «la primera de la lista»: los dos
        // proyectos del E2E corren en paralelo contra la misma base y cada uno crea la
        // suya, así que quedarse con la primera fila hacía que un proyecto operase sobre
        // la orden del otro. Los botones llevan el número en su nombre accesible.
        const ordenes = (await api(page, "get", "/sale-orders?limit=100")) as {
            data: Array<{ id: string; items: Array<{ productId: string | null }> }>;
        };
        const orden = ordenes.data.find((o) => o.items.some((i) => i.productId === productId));
        expect(orden, "la orden recién creada debería existir").toBeTruthy();
        const numero = orden!.id.slice(0, 8).toUpperCase();

        // T5-03 — con esa venta pendiente quedan 17 sin comprometer, y el formulario no deja
        // vender 18: lo dice en el campo y no crea la orden. Antes se aceptaba y el problema
        // salía al enviarla.
        await page.getByRole("button", { name: "Nueva orden" }).click();
        const otra = page.getByRole("dialog");
        await otra.getByLabel("Producto").first().selectOption({ label: producto });
        await expect(otra.getByText(`Disponible: ${STOCK_INICIAL - CANTIDAD}`)).toBeVisible();
        await otra.getByLabel("Cant.").first().fill(String(STOCK_INICIAL - CANTIDAD + 1));
        await otra.getByRole("button", { name: "Crear orden" }).click();
        await expect(otra.getByText("Supera lo disponible")).toBeVisible();
        await otra.getByRole("button", { name: "Cancelar" }).click();
        await expect(otra).toBeHidden();
        const tras = (await api(page, "get", "/sale-orders?limit=100")) as { data: Array<{ items: Array<{ productId: string | null }> }> };
        expect(tras.data.filter((o) => o.items.some((i) => i.productId === productId))).toHaveLength(1);

        // Enviar descuenta el stock.
        await page.getByRole("button", { name: `Marcar como enviada la Venta #${numero}` }).click();
        await expect.poll(() => stockDe(page, productId)).toBe(STOCK_INICIAL - CANTIDAD);

        // Cancelar la orden ya enviada, por la interfaz. Hasta T2-42 este paso iba por API
        // porque los botones solo aparecían en estado PENDIENTE: la reposición de T0-03
        // existía en el backend y era inalcanzable desde la aplicación.
        await page.getByRole("button", { name: `Cancelar la orden enviada Venta #${numero}` }).click();

        const confirmacion = page.getByRole("dialog");
        // El diálogo dice cuántas unidades vuelven al inventario antes de mover nada.
        await expect(confirmacion.getByText(`Se repondrán ${CANTIDAD} unidades`)).toBeVisible();
        await confirmacion.getByRole("button", { name: "Cancelar la orden" }).click();
        await expect(confirmacion).toBeHidden();

        // Antes de T0-03, cancelar una venta ya enviada no reponía nada.
        await expect.poll(() => stockDe(page, productId)).toBe(STOCK_INICIAL);

        // Y el estado que ve el usuario acompaña al efecto en la base.
        await expect(page.getByText("Cancelado").first()).toBeVisible();

        await api(page, "delete", `/products/${productId}`);
    });

    test("una entrega parcial suma solo lo que llega, y cancelar retira eso (T5-04)", async ({ page }) => {
        await login(page);
        const producto = `E2E-compra-${sufijo()}`;
        const PEDIDAS = 100;
        const LLEGAN = 60;

        // Producto y orden de partida por API: lo que se prueba aquí es la recepción.
        const creado = (await api(page, "post", "/products", { name: producto, price: 50, stock: 0 })) as { id: string };
        const orden = (await api(page, "post", "/purchase-orders", {
            items: [{ productId: creado.id, productName: producto, quantity: PEDIDAS, unitPrice: 20 }],
        })) as { id: string };
        const numero = orden.id.slice(0, 8).toUpperCase();

        // Llegan 60 de 100, registrados por la interfaz.
        await page.goto("/purchase-orders");
        await page.getByRole("button", { name: `Recibir mercancía de la orden #${numero}` }).click();
        const entrega = page.getByRole("dialog");
        const campo = entrega.getByLabel(`Llega ahora de ${producto}`);
        // Propone lo que falta: el caso «llegó todo» no obliga a escribir.
        await expect(campo).toHaveValue(String(PEDIDAS));
        await campo.fill(String(LLEGAN));
        await expect(entrega.getByText("La orden quedará recibida a medias.")).toBeVisible();
        await entrega.getByRole("button", { name: "Registrar recepción" }).click();
        await expect(entrega).toBeHidden();

        // Antes de T5-04, recibir sumaba las 100.
        await expect.poll(() => stockDe(page, creado.id)).toBe(LLEGAN);
        // Dentro de **su** tarjeta: los dos proyectos del E2E crean a la vez una orden igual.
        const tarjeta = page.locator("div.rounded-xl").filter({ hasText: `Orden #${numero}` });
        await expect(tarjeta.getByText("Recibida a medias")).toBeVisible();
        await expect(tarjeta.getByText(`${LLEGAN} de ${PEDIDAS} uds. recibidas`)).toBeVisible();

        // Cancelar la orden a medias retira lo que llegó, no lo pedido.
        await page.getByRole("button", { name: `Cancelar la orden recibida #${numero}` }).click();
        const confirmacion = page.getByRole("dialog");
        await expect(confirmacion.getByText(`Se retirarán ${LLEGAN} unidades`)).toBeVisible();
        await confirmacion.getByRole("button", { name: "Cancelar la orden" }).click();
        await expect(confirmacion).toBeHidden();

        await expect.poll(() => stockDe(page, creado.id)).toBe(0);
    });

    test("el almacén recibe una compra y no puede cambiar un precio, ni por la interfaz ni por la API (T5-13)", async ({ page, browser }) => {
        // ADMIN prepara el producto y la orden: lo que se prueba es lo que puede el almacén.
        await login(page);
        const producto = `E2E-almacen-${sufijo()}`;
        const creado = (await api(page, "post", "/products", { name: producto, price: 50, stock: 0 })) as { id: string };
        const orden = (await api(page, "post", "/purchase-orders", {
            items: [{ productId: creado.id, productName: producto, quantity: 8, unitPrice: 20 }],
        })) as { id: string };
        const numero = orden.id.slice(0, 8).toUpperCase();

        const contexto = await browser.newContext();
        const almacen = await contexto.newPage();
        try {
            await login(almacen, ALMACEN);

            // Recibe por la interfaz, y la orden no le ofrece cancelar ni eliminar.
            await almacen.goto("/purchase-orders");
            const tarjeta = almacen.locator("div.rounded-xl").filter({ hasText: `Orden #${numero}` });
            await expect(tarjeta.getByTitle("Cancelar orden")).toHaveCount(0);
            await expect(almacen.getByRole("button", { name: "Nueva orden" })).toHaveCount(0);
            await almacen.getByRole("button", { name: `Recibir mercancía de la orden #${numero}` }).click();
            const entrega = almacen.getByRole("dialog");
            await entrega.getByRole("button", { name: "Registrar recepción" }).click();
            await expect(entrega).toBeHidden();
            await expect.poll(() => stockDe(page, creado.id)).toBe(8);
            await expect(tarjeta.getByText("Recibida", { exact: true })).toBeVisible();

            // El catálogo no le ofrece editar el producto…
            await almacen.goto("/catalog/products");
            await almacen.getByPlaceholder("Buscar producto...").fill(producto);
            await expect(almacen.getByText(producto)).toBeVisible();
            await expect(almacen.getByRole("button", { name: `Editar ${producto}` })).toHaveCount(0);

            // …y la API tampoco se lo deja hacer por su cuenta.
            const res = await apiCruda(almacen, "put", `/products/${creado.id}`, { price: 1 });
            expect(res.status()).toBe(403);
            expect((await res.json()).code).toBe("FORBIDDEN");
            const trasElIntento = (await api(page, "get", `/products/${creado.id}`)) as { price: string };
            expect(Number(trasElIntento.price)).toBe(50);
        } finally {
            await contexto.close();
        }
    });

    test("una sugerencia de reposición se revisa y se convierte en una orden pendiente (T5-05)", async ({ page }) => {
        await login(page);
        const marca = sufijo();
        const producto = `E2E-repo-${marca}`;
        const MINIMO = 12;

        // Proveedor con plazo y producto bajo mínimo, sin compras ni coste: su sugerencia no
        // trae precio y tiene que escribirse, que es el caso que no puede rellenarse solo.
        const proveedor = (await api(page, "post", "/suppliers", { name: `E2E-prov-${marca}`, leadTimeDays: 7 })) as { id: string };
        const creado = (await api(page, "post", "/products", {
            name: producto, price: 50, stock: 0, minStock: MINIMO, supplierId: proveedor.id,
        })) as { id: string };

        await page.goto("/purchase-orders");
        await page.getByRole("link", { name: "Sugerencias de reposición" }).click();
        await expect(page.getByRole("heading", { name: "Sugerencias de reposición", level: 1 })).toBeVisible();

        const incluir = page.getByRole("checkbox", { name: `Incluir ${producto}` });
        // Sin velocidad de salida: lo sugerido es cubrir el mínimo.
        await expect(page.getByLabel(`Cantidad a pedir de ${producto}`)).toHaveValue(String(MINIMO));
        // Sin precio conocido empieza sin marcar y vacío: nunca el precio de venta.
        await expect(incluir).not.toBeChecked();
        await expect(page.getByLabel(`Precio unitario de ${producto}`)).toHaveValue("");

        // «Generar» crea todo lo marcado en la página, y el seed deja marcadas las líneas con
        // precio conocido: se desmarcan para no crear órdenes ajenas al escenario. De una en una
        // y siempre la primera: `.all()` fija posiciones dentro de «marcadas», y cada casilla
        // desmarcada desplaza a las demás.
        const marcadas = page.getByRole("checkbox", { checked: true });
        while ((await marcadas.count()) > 0) await marcadas.first().uncheck();

        await incluir.check();
        await page.getByLabel(`Precio unitario de ${producto}`).fill("4.5");
        const respuesta = page.waitForResponse((r) => r.url().includes("/purchase-orders/suggestions") && r.request().method() === "POST");
        await page.getByRole("button", { name: "Generar órdenes" }).click();
        expect((await respuesta).status()).toBe(201);

        // Lo pedido ya cuenta como pendiente de recibir: la sugerencia desaparece sola.
        await expect(incluir).toBeHidden();

        const { data: ordenes } = (await api(page, "get", "/purchase-orders?status=PENDING&limit=100")) as {
            data: Array<{ supplierId: string | null; items: Array<{ productId: string | null; quantity: number; unitPrice: string }> }>;
        };
        const generada = ordenes.filter((o) => o.supplierId === proveedor.id);
        expect(generada).toHaveLength(1);
        expect(generada[0]!.items).toEqual([expect.objectContaining({ productId: creado.id, quantity: MINIMO, unitPrice: "4.5" })]);
        // Un borrador no mueve stock.
        expect(await stockDe(page, creado.id)).toBe(0);
    });

    test("lo recibido y lo enviado hoy sale en el informe de este mes, y se exporta (T5-09)", async ({ page }) => {
        await login(page);
        const producto = `E2E-periodo-${sufijo()}`;

        // Una compra recibida y una venta enviada ahora mismo. El precio de venta es alto a
        // propósito: el desglose enseña los 50 que más facturan, y el seed ya tiene ventas
        // este mes; así el producto del escenario sale el primero.
        const creado = (await api(page, "post", "/products", { name: producto, price: 90000, stock: 0 })) as { id: string };
        const compra = (await api(page, "post", "/purchase-orders", {
            items: [{ productId: creado.id, productName: producto, quantity: 5, unitPrice: 10 }],
        })) as { id: string; items: Array<{ id: string }> };
        await api(page, "post", `/purchase-orders/${compra.id}/receipts`, { items: [{ itemId: compra.items[0]!.id, quantity: 5 }] });
        const venta = (await api(page, "post", "/sale-orders", {
            customerName: "E2E periodo",
            items: [{ productId: creado.id, productName: producto, quantity: 2, unitPrice: 90000 }],
        })) as { id: string };
        await api(page, "patch", `/sale-orders/${venta.id}`, { status: "SHIPPED" });

        await page.goto("/reports");
        await page.getByRole("link", { name: "Ventas y compras por periodo" }).click();
        await expect(page.getByRole("heading", { name: "Ventas y compras por periodo", level: 1 })).toBeVisible();
        // Abre en «este mes», y el rango que enseña es el que resolvió el backend.
        await expect(page.getByRole("button", { name: "Este mes" })).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByText(/zona horaria America\/Santo_Domingo/)).toBeVisible();

        // Uds. vendidas, ventas, uds. compradas, compras.
        const fila = page.getByRole("row", { name: new RegExp(producto) });
        await expect(fila.getByRole("cell")).toHaveText([new RegExp(producto), "Sin categoría", "2", "$180,000.00", "5", "$50.00"]);

        // El CSV es el del periodo que se está viendo.
        const descarga = page.waitForEvent("download");
        await page.getByRole("button", { name: "Exportar CSV" }).click();
        expect((await descarga).suggestedFilename()).toMatch(/^informe-\d{4}-\d{2}-01-\d{4}-\d{2}-\d{2}\.csv$/);
    });
});
