import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "../utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import PurchaseOrdersPage from "@/modules/purchase-orders/components/PurchaseOrdersPage";
import type { ProductQuery, ProductWithAvailability } from "@/modules/products/types/product.types";

/**
 * T6-02 — el producto de una línea de venta o de compra se busca en el servidor.
 *
 * El defecto era silencioso: el formulario pedía «todos» los productos activos, el servidor
 * recortaba a cien —los más recientes— y uno más antiguo solo se podía escribir a mano, sin
 * `productId`, con lo que la orden no movía stock. Con los ~50 del seed no se veía. Lo que se
 * vigila aquí es que **la búsqueda viaja** y que el catálogo no se vuelve a pedir entero; que el
 * más antiguo de 150 aparezca es cosa del servidor, que filtra en el `where`.
 */

vi.mock("@/shared/lib/escaner", () => ({ obtenerLector: async () => ({ detectar: async () => null }) }));

const getProducts = vi.fn<(params?: ProductQuery) => Promise<{ data: ProductWithAvailability[] }>>();
const getProductByCode = vi.fn<(codigo: string) => Promise<ProductWithAvailability>>();
vi.mock("@/modules/products/api/product.api", async (original) => ({
    ...(await original<typeof import("@/modules/products/api/product.api")>()),
    getProducts: (params?: ProductQuery) => getProducts(params),
    getProductByCode: (codigo: string) => getProductByCode(codigo),
}));

const ventas: unknown[] = [];
vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }, isLoading: false }),
    useCreateSaleOrder: () => ({
        mutate: (dto: unknown, opciones?: { onSuccess?: () => void }) => { ventas.push(dto); opciones?.onSuccess?.(); },
        isPending: false,
    }),
    useUpdateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useShipSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

const compras: unknown[] = [];
vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    usePurchaseOrders: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }, isLoading: false }),
    useCreatePurchaseOrder: () => ({
        mutate: (dto: unknown, opciones?: { onSuccess?: () => void }) => { compras.push(dto); opciones?.onSuccess?.(); },
        isPending: false,
    }),
    useUpdatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeletePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useReceivePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({
    useSuppliers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

const TECLADO: ProductWithAvailability = {
    id: "p-teclado",
    name: "Teclado Logitech",
    description: null,
    sku: "PER-LOG",
    barcode: "4006381333931",
    price: "30.00",
    costPrice: "18.50",
    stock: 10,
    minStock: 1,
    imageUrl: null,
    imagePublicId: null,
    categoryId: null,
    brandId: null,
    supplierId: null,
    category: null,
    brand: null,
    supplier: null,
    tags: [],
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    committedStock: 7,
    availableStock: 3, stockLevels: [],
    abcClass: "A",
};
const MONITOR: ProductWithAvailability = {
    ...TECLADO, id: "p-monitor", name: "Monitor LG", sku: null, barcode: "5901234123457", price: "200.00", costPrice: null, availableStock: 5, stockLevels: [],
};
const RETIRADO: ProductWithAvailability = { ...TECLADO, id: "p-retirado", name: "Ratón retirado", barcode: "96385074", isActive: false };

const CATALOGO = [TECLADO, MONITOR];

function error404() {
    return new AxiosError("no", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 404, statusText: "Not Found", data: {}, headers: {}, config: { headers: new AxiosHeaders() },
    });
}

beforeEach(() => {
    ventas.length = 0;
    compras.length = 0;
    getProducts.mockReset();
    getProductByCode.mockReset();
    // Como el servidor: filtra por nombre, sin distinguir mayúsculas.
    getProducts.mockImplementation(async (params) => ({
        data: CATALOGO.filter((p) => p.name.toLowerCase().includes((params?.search ?? "").toLowerCase())),
    }));
    getProductByCode.mockImplementation(async (codigo) => {
        const producto = [...CATALOGO, RETIRADO].find((p) => p.barcode === codigo || p.sku === codigo);
        if (!producto) throw error404();
        return producto;
    });
});

type Usuario = ReturnType<typeof userEvent.setup>;

async function abrir(pagina: "venta" | "compra") {
    const user = userEvent.setup();
    renderWithProviders(pagina === "venta" ? <SaleOrdersPage /> : <PurchaseOrdersPage />);
    await user.click(screen.getByRole("button", { name: /Nueva orden/ }));
    return { user, dialogo: screen.getByRole("dialog") };
}

/** Como lo teclea una pistola USB: el código y un Intro en el campo del escáner. */
async function escanear(user: Usuario, dialogo: HTMLElement, codigo: string) {
    await user.click(within(dialogo).getByRole("button", { name: "Escanear" }));
    const escaner = screen.getByRole("dialog", { name: "Escanear un código" });
    await user.type(within(escaner).getByLabelText("O escríbelo"), `${codigo}{Enter}`);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Escanear un código" })).not.toBeInTheDocument());
}

describe("El producto de una línea de venta (T6-02)", () => {
    it("busca en el servidor lo que se escribe, entre los activos, y nunca pide el catálogo entero", async () => {
        const { user, dialogo } = await abrir("venta");

        // Abrir el formulario no carga nada: antes pedía 200 productos y recibía 100.
        expect(getProducts).not.toHaveBeenCalled();

        await user.type(within(dialogo).getByRole("combobox", { name: "Producto" }), "moni");

        await waitFor(() => expect(getProducts).toHaveBeenLastCalledWith({ search: "moni", isActive: true, limit: 8 }));
        expect(await within(dialogo).findByRole("option", { name: /Monitor LG/ })).toBeInTheDocument();
        expect(within(dialogo).queryByRole("option", { name: /Teclado/ })).not.toBeInTheDocument();
        for (const [params] of getProducts.mock.calls) {
            expect(params?.isActive).toBe(true);
            expect(params?.limit).toBe(8);
        }
    });

    it("elegirlo liga la línea al producto: nombre, precio, disponible y `productId` en la venta", async () => {
        const { user, dialogo } = await abrir("venta");

        await user.click(within(dialogo).getByRole("combobox", { name: "Producto" }));
        // La opción dice lo que hace falta para no equivocarse de producto: SKU y disponible.
        await user.click(await within(dialogo).findByRole("option", { name: /^Teclado Logitech\s*PER-LOG · Disponible: 3$/ }));

        expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("Teclado Logitech");
        expect(within(dialogo).getByLabelText("P. unit.")).toHaveValue(30);
        expect(within(dialogo).getByText("Disponible: 3")).toBeInTheDocument();

        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(ventas).toHaveLength(1);
        expect(ventas[0]).toMatchObject({ items: [{ productId: "p-teclado", productName: "Teclado Logitech", quantity: 1, unitPrice: 30 }] });
    });

    it("con el teclado: flechas y Enter eligen sin enviar la venta, y Escape cierra la lista y no el diálogo", async () => {
        const { user, dialogo } = await abrir("venta");
        const buscador = within(dialogo).getByRole("combobox", { name: "Producto" });

        await user.click(buscador);
        await within(dialogo).findByRole("option", { name: /Monitor LG/ });
        await user.keyboard("{Escape}");
        expect(buscador).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        await user.keyboard("{ArrowDown}");
        await within(dialogo).findByRole("option", { name: /Monitor LG/ });
        await user.keyboard("{ArrowDown}{Enter}");

        expect(ventas).toHaveLength(0);
        expect(within(dialogo).getByRole("button", { name: "Quitar el producto Monitor LG" })).toBeInTheDocument();
    });

    it("la lista se trae a la vista al abrirse, y la opción activa al moverse con las flechas", async () => {
        // El diálogo tiene scroll propio y la lista cuelga del campo: en la última línea quedaba
        // cortada por el borde, con una opción a la vista (visto en el navegador). jsdom no
        // maqueta, así que aquí solo se vigila que se pida el desplazamiento, y a quién.
        const desplazados: Element[] = [];
        Element.prototype.scrollIntoView = function (this: Element) { desplazados.push(this); };
        try {
            const { user, dialogo } = await abrir("venta");
            await user.click(within(dialogo).getByRole("combobox", { name: "Producto" }));
            const segunda = await within(dialogo).findByRole("option", { name: /Monitor LG/ });
            expect(desplazados).toContain(within(dialogo).getByRole("listbox", { name: "Productos encontrados" }));

            desplazados.length = 0;
            await user.keyboard("{ArrowDown}");
            expect(desplazados).toContain(segunda);
        } finally {
            Reflect.deleteProperty(Element.prototype, "scrollIntoView");
        }
    });

    it("mientras llega la búsqueda nueva, Enter no elige un resultado de la anterior", async () => {
        const { user, dialogo } = await abrir("venta");
        const buscador = within(dialogo).getByRole("combobox", { name: "Producto" });
        await user.click(buscador);
        await within(dialogo).findByRole("option", { name: /Teclado/ });

        await user.type(buscador, "moni{Enter}");

        expect(within(dialogo).queryByRole("button", { name: /^Quitar el producto/ })).not.toBeInTheDocument();
        expect(within(dialogo).queryByRole("option", { name: /Teclado/ })).not.toBeInTheDocument();
        expect(within(dialogo).getByRole("listbox", { name: "Productos encontrados" })).toHaveTextContent("Buscando…");
    });

    it("quitar el producto deja un ítem escrito a mano: sin `productId` y sin disponible que comprobar", async () => {
        const { user, dialogo } = await abrir("venta");
        await user.click(within(dialogo).getByRole("combobox", { name: "Producto" }));
        await user.click(await within(dialogo).findByRole("option", { name: /Teclado/ }));

        await user.click(within(dialogo).getByRole("button", { name: "Quitar el producto Teclado Logitech" }));

        expect(within(dialogo).getByRole("combobox", { name: "Producto" })).toBeInTheDocument();
        expect(within(dialogo).queryByText(/^Disponible:/)).not.toBeInTheDocument();
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));
        expect((ventas[0] as { items: Array<{ productId?: string }> }).items[0]!.productId).toBeUndefined();
    });

    it("escanear un código añade la línea con su precio y su disponible, en la fila vacía", async () => {
        const { user, dialogo } = await abrir("venta");

        await escanear(user, dialogo, "4006381333931");

        expect(getProductByCode).toHaveBeenCalledWith("4006381333931");
        // El Intro del escáner no envía la venta: su formulario no es hijo del de la orden.
        expect(ventas).toHaveLength(0);
        expect(await within(dialogo).findByRole("button", { name: "Quitar el producto Teclado Logitech" })).toBeInTheDocument();
        expect(within(dialogo).getAllByLabelText("Nombre")).toHaveLength(1);
        expect(within(dialogo).getByLabelText("P. unit.")).toHaveValue(30);
        expect(within(dialogo).getByText("Disponible: 3")).toBeInTheDocument();
    });

    it("escanear otro añade una línea, y repetir un código suma una unidad a la suya", async () => {
        const { user, dialogo } = await abrir("venta");

        await escanear(user, dialogo, "4006381333931");
        await escanear(user, dialogo, "5901234123457");
        await escanear(user, dialogo, "4006381333931");

        await waitFor(() => expect(within(dialogo).getAllByLabelText("Cant.")[0]).toHaveValue(2));
        expect(within(dialogo).getAllByLabelText("Nombre")).toHaveLength(2);
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));
        expect(ventas[0]).toMatchObject({
            items: [
                { productId: "p-teclado", quantity: 2, unitPrice: 30 },
                { productId: "p-monitor", quantity: 1, unitPrice: 200 },
            ],
        });
    });

    it("lo escaneado también cuenta para el disponible: una unidad de más no deja crear la venta", async () => {
        const { user, dialogo } = await abrir("venta");
        for (let i = 0; i < 4; i++) await escanear(user, dialogo, "4006381333931");
        await waitFor(() => expect(within(dialogo).getByLabelText("Cant.")).toHaveValue(4));

        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(await within(dialogo).findByText("Supera lo disponible")).toBeInTheDocument();
        expect(ventas).toHaveLength(0);
    });

    it("el código de un producto inactivo no añade nada, y lo dice", async () => {
        const { user, dialogo } = await abrir("venta");

        await escanear(user, dialogo, "96385074");

        expect(await within(dialogo).findByRole("alert")).toHaveTextContent("«Ratón retirado» está inactivo y no se puede añadir.");
        expect(within(dialogo).getByRole("combobox", { name: "Producto" })).toBeInTheDocument();
        expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("");
    });

    it("un código que no es de nadie tampoco, y el aviso se va con el siguiente escaneo bueno", async () => {
        const { user, dialogo } = await abrir("venta");

        await escanear(user, dialogo, "0000");
        expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Ningún producto tiene el código «0000».");
        expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("");

        await escanear(user, dialogo, "5901234123457");
        await within(dialogo).findByRole("button", { name: "Quitar el producto Monitor LG" });
        expect(within(dialogo).queryByRole("alert")).not.toBeInTheDocument();
    });
});

describe("El producto de una línea de compra (T6-02)", () => {
    it("se busca igual, y propone el coste y no el precio de venta", async () => {
        const { user, dialogo } = await abrir("compra");
        expect(getProducts).not.toHaveBeenCalled();

        await user.type(within(dialogo).getByRole("combobox", { name: "Producto" }), "tecl");
        await waitFor(() => expect(getProducts).toHaveBeenLastCalledWith({ search: "tecl", isActive: true, limit: 8 }));
        await user.click(await within(dialogo).findByRole("option", { name: /Teclado Logitech/ }));

        expect(within(dialogo).getByLabelText("P. unit.")).toHaveValue(18.5);
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));
        expect(compras[0]).toMatchObject({ items: [{ productId: "p-teclado", productName: "Teclado Logitech", quantity: 1, unitPrice: 18.5 }] });
    });

    it("escanear añade la línea con el coste; sin coste conocido, con el precio; y repetir suma", async () => {
        const { user, dialogo } = await abrir("compra");

        await escanear(user, dialogo, "4006381333931");
        await escanear(user, dialogo, "5901234123457");
        await escanear(user, dialogo, "5901234123457");

        await waitFor(() => expect(within(dialogo).getAllByLabelText("Cant.")[1]).toHaveValue(2));
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));
        expect(compras[0]).toMatchObject({
            items: [
                { productId: "p-teclado", quantity: 1, unitPrice: 18.5 },
                { productId: "p-monitor", quantity: 2, unitPrice: 200 },
            ],
        });
    });

    it("el código de un producto inactivo no añade nada", async () => {
        const { user, dialogo } = await abrir("compra");

        await escanear(user, dialogo, "96385074");

        expect(await within(dialogo).findByRole("alert")).toHaveTextContent("«Ratón retirado» está inactivo y no se puede añadir.");
        expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("");
    });
});
