import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import { ManualMovementModal } from "@/modules/products/components/ManualMovementModal";
import { ProductForm } from "@/modules/products/components/ProductForm";
import { LotesDelProducto } from "@/modules/products/components/LotesDelProducto";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import PurchaseOrdersPage from "@/modules/purchase-orders/components/PurchaseOrdersPage";
import CaducidadesPage from "@/modules/reports/components/CaducidadesPage";
import { informeDeCaducidadesSchema, lotesDeProductoSchema, type InformeDeCaducidades, type Rol } from "@/shared/contratos";
import { cuandoCaduca, tonoDeCaducidad } from "@/shared/lib/lotes";
import { traducir, traducirCantidad } from "@/shared/i18n/traducir";
import type { Product, ProductWithAvailability } from "@/modules/products/types/product.types";
import type { PurchaseOrder } from "@/modules/purchase-orders/types/purchase-orders.types";

/**
 * T5-15 — lotes y caducidad en la interfaz.
 *
 * Lo que se vigila es lo que la pantalla **manda**: que la entrada de un producto que lleva
 * lotes no salga sin su fecha, que el lote viaje de una sola forma —uno que existe, o fecha y
 * código—, y que dar de baja lo caducado sea un ajuste a cero de ese lote en ese almacén. Y lo
 * que **calla**: un producto que no lleva lotes no enseña nada de esto.
 */

const CENTRAL = { id: "w-central", name: "Tienda Central", address: null, isDefault: true, isActive: true, createdAt: "", updatedAt: "" };
const NORTE = { ...CENTRAL, id: "w-norte", name: "Sucursal Norte", isDefault: false };

const estado = vi.hoisted(() => ({
    rol: "ADMIN" as string,
    almacenes: [] as unknown[],
    movimientos: [] as Array<{ productId: string; dto: Record<string, unknown> }>,
    creados: [] as Array<Record<string, unknown>>,
    actualizados: [] as Array<{ id: string; dto: Record<string, unknown> }>,
    recibidas: [] as Array<{ id: string; dto: { items: unknown[] } }>,
    consultas: [] as Array<Record<string, unknown>>,
    lotesPedidos: 0,
    lotes: { lots: [] as unknown[], withoutLot: 0 },
    informe: null as unknown,
    ordenes: [] as unknown[],
}));

vi.mock("@/modules/warehouses/api/warehouses.api", () => ({ getWarehouses: () => Promise.resolve(estado.almacenes) }));
vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: () => ({ user: { id: "u1", name: "Sofía", role: estado.rol } }) }));
vi.mock("@/modules/products/api/product.api", async (original) => ({
    ...(await original<typeof import("@/modules/products/api/product.api")>()),
    getProductLots: () => {
        estado.lotesPedidos += 1;
        return Promise.resolve(estado.lotes);
    },
    createManualMovement: (productId: string, dto: Record<string, unknown>) => {
        estado.movimientos.push({ productId, dto });
        return Promise.resolve({});
    },
}));
vi.mock("@/modules/reports/api/reports.api", () => ({
    getExpiryReport: (consulta: Record<string, unknown>) => {
        estado.consultas.push(consulta);
        return Promise.resolve(estado.informe);
    },
}));
vi.mock("@/modules/products/hooks/useCreateProduct", () => ({
    useCreateProduct: () => ({ mutate: (dto: Record<string, unknown>) => { estado.creados.push(dto); }, isPending: false }),
}));
vi.mock("@/modules/products/hooks/useUpdateProduct", () => ({
    useUpdateProduct: () => ({ mutate: (vars: { id: string; dto: Record<string, unknown> }) => { estado.actualizados.push(vars); }, isPending: false }),
}));
vi.mock("@/modules/catalog/hooks/useCategories", () => ({ useCategories: () => ({ data: [] }) }));
vi.mock("@/modules/catalog/hooks/useBrands", () => ({ useBrands: () => ({ data: [] }) }));
vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({ useSuppliers: () => ({ data: [], isLoading: false }) }));
vi.mock("@/modules/tags/hooks/useTags", () => ({ useTags: () => ({ data: [] }) }));
vi.mock("@/modules/products/hooks/useProducts", () => ({ useProducts: () => ({ data: { data: [] } }) }));
vi.mock("@/shared/components/EscanerModal", () => ({ EscanerModal: () => null }));
vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    usePurchaseOrders: () => ({ data: { data: estado.ordenes, meta: { total: estado.ordenes.length, page: 1, limit: 10, totalPages: 1 } }, isLoading: false }),
    useCreatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeletePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useReceivePurchaseOrder: () => ({
        mutate: (vars: { id: string; dto: { items: unknown[] } }) => { estado.recibidas.push(vars); },
        isPending: false,
    }),
}));

const producto = (over: Partial<Product> = {}): Product => ({
    id: "p-yogur", name: "Yogur", description: null, sku: "ALI-YOG", barcode: null, price: "3.00", costPrice: null,
    stock: 14, minStock: 0, tracksLots: true, imageUrl: null, imagePublicId: null, isActive: true,
    categoryId: null, brandId: null, supplierId: null, category: null, brand: null, supplier: null, tags: [],
    createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
    ...over,
});

/** Un lote caducado solo en la central, y uno vigente repartido entre los dos almacenes. */
const LOTES = lotesDeProductoSchema.parse({
    withoutLot: 2,
    lots: [
        { id: "l-viejo", code: "VIEJO", expiresAt: "2026-10-07", daysLeft: -3, expired: true, stock: 4, levels: [{ warehouseId: "w-central", stock: 4 }] },
        {
            id: "l-bueno", code: "BUENO", expiresAt: "2026-10-22", daysLeft: 12, expired: false, stock: 8,
            levels: [{ warehouseId: "w-central", stock: 5 }, { warehouseId: "w-norte", stock: 3 }],
        },
    ],
});

beforeEach(() => {
    estado.rol = "ADMIN";
    estado.almacenes = [CENTRAL];
    estado.movimientos.length = 0;
    estado.creados.length = 0;
    estado.actualizados.length = 0;
    estado.recibidas.length = 0;
    estado.consultas.length = 0;
    estado.lotesPedidos = 0;
    estado.lotes = LOTES;
    estado.informe = null;
    estado.ordenes = [];
});

// ─────────────────────────────────────────────────────────────────────────────
describe("el movimiento a mano de un producto con lotes", () => {
    async function abrir(p: Product = producto()) {
        const user = userEvent.setup();
        renderWithProviders(<ManualMovementModal isOpen onClose={vi.fn()} product={p} />);
        const dialogo = within(screen.getByRole("dialog"));
        return { user, dialogo };
    }
    const registrar = (user: ReturnType<typeof userEvent.setup>, dialogo: ReturnType<typeof within>) =>
        user.click(dialogo.getByRole("button", { name: "Registrar" }));

    it("una entrada no sale sin fecha de caducidad, y lo dice junto al campo", async () => {
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Compra a proveedor");

        await registrar(user, dialogo);

        expect(await dialogo.findByText("Indica la fecha de caducidad")).toBeInTheDocument();
        expect(estado.movimientos).toHaveLength(0);
    });

    it("con la fecha —y el código, si se escribe— crea el lote: no manda ningún `lotId`", async () => {
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Compra a proveedor");
        await user.type(dialogo.getByLabelText("Caducidad *"), "2026-12-31");
        await user.type(dialogo.getByLabelText("Lote (opcional)"), "  L-77 ");
        await user.clear(dialogo.getByLabelText("Cantidad"));
        await user.type(dialogo.getByLabelText("Cantidad"), "6");

        await registrar(user, dialogo);

        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]).toEqual({
            productId: "p-yogur",
            dto: { type: "IN", quantity: 6, reason: "Compra a proveedor", note: "", expiresAt: "2026-12-31", lotCode: "L-77", warehouseId: undefined },
        });
    });

    it("sumar a un lote que ya existe manda solo ese lote, y los campos del nuevo desaparecen", async () => {
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Compra a proveedor");
        await user.type(dialogo.getByLabelText("Caducidad *"), "2026-12-31");

        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Lote" }), "l-bueno");

        expect(dialogo.queryByLabelText("Caducidad *")).not.toBeInTheDocument();
        await registrar(user, dialogo);
        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]!.dto).toEqual({ type: "IN", quantity: 1, reason: "Compra a proveedor", note: "", lotId: "l-bueno", warehouseId: undefined });
    });

    it("una salida sin elegir lote no manda ninguno: decide el orden de caducidad", async () => {
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "OUT");
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Merma o deterioro");

        const lote = await dialogo.findByRole("combobox", { name: "Lote" });
        expect(within(lote).getAllByRole("option").map((o) => o.textContent)).toEqual([
            "Por orden de caducidad",
            "VIEJO · 07 oct 2026 · 4 uds. · caducado",
            "BUENO · 22 oct 2026 · 8 uds.",
        ]);
        // Una salida no crea lotes: no hay dónde escribir una fecha.
        expect(dialogo.queryByLabelText("Caducidad *")).not.toBeInTheDocument();

        await registrar(user, dialogo);
        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]!.dto).toEqual({ type: "OUT", quantity: 1, reason: "Merma o deterioro", note: "", warehouseId: undefined });
    });

    it("dar de baja un lote es un ajuste a cero de ese lote: el cero vale, y el campo dice de qué es", async () => {
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "ADJUSTMENT");
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Corrección de error");
        expect(dialogo.getByLabelText("Nuevo stock objetivo")).toBeInTheDocument();

        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Lote" }), "l-viejo");
        const cantidad = dialogo.getByLabelText("Unidades que quedan de ese lote");
        await user.clear(cantidad);
        await user.type(cantidad, "0");
        await registrar(user, dialogo);

        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]!.dto).toMatchObject({ type: "ADJUSTMENT", quantity: 0, lotId: "l-viejo" });
    });

    it("cero unidades no vale en una entrada ni en una salida", async () => {
        const { user, dialogo } = await abrir(producto({ tracksLots: false }));
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Otro");
        await user.clear(dialogo.getByLabelText("Cantidad"));
        await user.type(dialogo.getByLabelText("Cantidad"), "0");

        await registrar(user, dialogo);

        // Lo para el propio campo (`min="1"`) antes de que el formulario llegue a enviarse; en
        // un ajuste el mínimo baja a cero, que es lo que deja dar de baja un lote.
        expect(dialogo.getByLabelText("Cantidad")).toBeInvalid();
        expect(estado.movimientos).toHaveLength(0);
        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "ADJUSTMENT");
        expect(dialogo.getByLabelText("Nuevo stock objetivo")).toBeValid();
    });

    it("con varios almacenes, una salida solo ofrece los lotes que hay en el elegido, con lo que hay allí", async () => {
        estado.almacenes = [CENTRAL, NORTE];
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "OUT");
        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Almacén" }), "w-norte");

        const lote = dialogo.getByRole("combobox", { name: "Lote" });
        // El caducado no está en el norte: no se ofrece.
        expect(within(lote).getAllByRole("option").map((o) => o.textContent)).toEqual(["Por orden de caducidad", "BUENO · 22 oct 2026 · 3 uds."]);
    });

    it("cambiar de tipo o de almacén suelta el lote elegido: no se queda uno que ya no está en la lista", async () => {
        estado.almacenes = [CENTRAL, NORTE];
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "OUT");
        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Lote" }), "l-viejo");
        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Merma o deterioro");

        await user.selectOptions(dialogo.getByRole("combobox", { name: "Almacén" }), "w-norte");
        expect(dialogo.getByRole("combobox", { name: "Lote" })).toHaveValue("");

        await registrar(user, dialogo);
        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]!.dto).toEqual({ type: "OUT", quantity: 1, reason: "Merma o deterioro", note: "", warehouseId: "w-norte" });
    });

    it("pasar de salida a entrada con un lote elegido vuelve a «lote nuevo» y pide su fecha", async () => {
        const { user, dialogo } = await abrir();
        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "OUT");
        await user.selectOptions(await dialogo.findByRole("combobox", { name: "Lote" }), "l-viejo");

        await user.selectOptions(dialogo.getByLabelText("Tipo de movimiento"), "IN");

        expect(dialogo.getByRole("combobox", { name: "Lote" })).toHaveValue("");
        expect(dialogo.getByLabelText("Caducidad *")).toBeInTheDocument();
    });

    it("un producto que no lleva lotes no enseña nada de esto ni manda nada de lote", async () => {
        const { user, dialogo } = await abrir(producto({ tracksLots: false }));
        expect(dialogo.queryByRole("combobox", { name: "Lote" })).not.toBeInTheDocument();
        expect(dialogo.queryByLabelText("Caducidad *")).not.toBeInTheDocument();

        await user.selectOptions(dialogo.getByLabelText("Motivo *"), "Compra a proveedor");
        await registrar(user, dialogo);

        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]!.dto).toEqual({ type: "IN", quantity: 1, reason: "Compra a proveedor", note: "", warehouseId: undefined });
        // Ni los pide: abrir el diálogo de un producto sin lotes no cuesta una petición.
        expect(estado.lotesPedidos).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("el formulario de producto", () => {
    const rellenar = async (user: ReturnType<typeof userEvent.setup>, stock?: string) => {
        await user.type(screen.getByLabelText("Nombre *"), "Yogur");
        await user.type(screen.getByLabelText("Precio *"), "3");
        if (stock) await user.type(screen.getByLabelText("Stock inicial"), stock);
    };
    const casilla = () => screen.getByRole("checkbox", { name: "Lleva lotes y fecha de caducidad" });

    it("al marcar los lotes con stock inicial pide la caducidad de ese stock, y no crea sin ella", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);
        await rellenar(user, "6");
        // Sin marcar, no hay nada que fechar.
        expect(screen.queryByLabelText("Fecha de caducidad *")).not.toBeInTheDocument();

        await user.click(casilla());
        await user.click(screen.getByRole("button", { name: "Crear producto" }));

        expect(await screen.findByText("Indica la fecha de caducidad")).toBeInTheDocument();
        expect(estado.creados).toHaveLength(0);

        await user.type(screen.getByLabelText("Fecha de caducidad *"), "2026-12-31");
        await user.click(screen.getByRole("button", { name: "Crear producto" }));

        await waitFor(() => expect(estado.creados).toHaveLength(1));
        expect(estado.creados[0]).toMatchObject({ name: "Yogur", stock: 6, tracksLots: true, lotExpiresAt: "2026-12-31", lotCode: undefined });
    });

    it("sin stock inicial no pide fecha: no hay nada que meter en un lote", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);
        await rellenar(user);

        await user.click(casilla());
        expect(screen.queryByLabelText("Fecha de caducidad *")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Crear producto" }));

        await waitFor(() => expect(estado.creados).toHaveLength(1));
        expect(estado.creados[0]).toMatchObject({ tracksLots: true, lotExpiresAt: undefined, lotCode: undefined });
    });

    it("la fecha escrita y luego descartada no viaja: desmarcar los lotes la suelta", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} />);
        await rellenar(user, "6");
        await user.click(casilla());
        await user.type(screen.getByLabelText("Fecha de caducidad *"), "2026-12-31");

        await user.click(casilla());
        await user.click(screen.getByRole("button", { name: "Crear producto" }));

        await waitFor(() => expect(estado.creados).toHaveLength(1));
        expect(estado.creados[0]).toMatchObject({ stock: 6, tracksLots: false, lotExpiresAt: undefined });
    });

    it("al editar un producto con lotes, el stock no se toca desde aquí ni viaja", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={producto()} />);

        expect(screen.getByLabelText("Stock inicial")).toBeDisabled();
        expect(screen.getByText(/El stock de un producto con lotes no se edita aquí/)).toBeInTheDocument();
        expect(casilla()).toBeChecked();
        // Tiene stock y lleva lotes, pero aquí no entra nada: no hay fecha que pedir.
        expect(screen.queryByLabelText("Fecha de caducidad *")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

        await waitFor(() => expect(estado.actualizados).toHaveLength(1));
        expect(estado.actualizados[0]!.dto).toMatchObject({ tracksLots: true, stock: undefined });
    });

    it("desmarcarlo viaja como `false`: es una decisión, no un campo sin tocar", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={producto()} />);

        await user.click(casilla());
        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

        await waitFor(() => expect(estado.actualizados).toHaveLength(1));
        expect(estado.actualizados[0]!.dto.tracksLots).toBe(false);
    });

    it("un producto sin lotes sigue editando su stock como siempre", async () => {
        const user = userEvent.setup();
        renderWithProviders(<ProductForm isOpen onClose={vi.fn()} product={producto({ tracksLots: false })} />);

        expect(screen.getByLabelText("Stock inicial")).toBeEnabled();
        await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

        await waitFor(() => expect(estado.actualizados).toHaveLength(1));
        expect(estado.actualizados[0]!.dto).toMatchObject({ tracksLots: false, stock: 14 });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("recibir una compra", () => {
    const linea = (over: Partial<PurchaseOrder["items"][number]>): PurchaseOrder["items"][number] => ({
        id: "i", purchaseOrderId: "o", productId: "p", product: null, productName: "Producto",
        quantity: 1, receivedQuantity: 0, unitPrice: "10", createdAt: "", ...over,
    });
    const ORDEN: PurchaseOrder = {
        id: "dddddddd-1111-2222-3333-444444444444", supplierId: null, supplier: null,
        warehouseId: "w-central", warehouse: { id: "w-central", name: "Tienda Central" }, status: "PENDING", notes: null,
        items: [
            linea({ id: "yogur", productId: "p-yogur", product: { id: "p-yogur", name: "Yogur", sku: null, tracksLots: true }, productName: "Yogur", quantity: 10 }),
            linea({ id: "tornillo", productId: "p-tornillo", product: { id: "p-tornillo", name: "Tornillo", sku: null, tracksLots: false }, productName: "Tornillo", quantity: 5 }),
        ],
        createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
    };

    async function abrir() {
        estado.ordenes = [ORDEN];
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        await user.click(screen.getByRole("button", { name: "Recibir mercancía de la orden #DDDDDDDD" }));
        return { user, dialogo: within(screen.getByRole("dialog")) };
    }

    it("solo la línea del producto con lotes pide caducidad, y sin ella no se puede confirmar", async () => {
        const { dialogo } = await abrir();

        expect(dialogo.getByLabelText("Caducidad de Yogur")).toBeInTheDocument();
        expect(dialogo.queryByLabelText("Caducidad de Tornillo")).not.toBeInTheDocument();
        expect(dialogo.getByText("Indica cuándo caduca")).toBeInTheDocument();
        expect(dialogo.getByRole("button", { name: "Registrar recepción" })).toBeDisabled();
    });

    it("con la fecha, la recepción lleva el lote en su línea y nada en la otra", async () => {
        const { user, dialogo } = await abrir();
        await user.type(dialogo.getByLabelText("Caducidad de Yogur"), "2026-11-15");
        await user.type(dialogo.getByLabelText("Lote de Yogur"), "R-9");

        await user.click(dialogo.getByRole("button", { name: "Registrar recepción" }));

        expect(estado.recibidas).toEqual([{
            id: ORDEN.id,
            dto: { items: [{ itemId: "yogur", quantity: 10, expiresAt: "2026-11-15", lotCode: "R-9" }, { itemId: "tornillo", quantity: 5 }] },
        }]);
    });

    it("sin código, el lote no viaja como cadena vacía: lo nombra el servidor por su fecha", async () => {
        const { user, dialogo } = await abrir();
        await user.type(dialogo.getByLabelText("Caducidad de Yogur"), "2026-11-15");
        await user.type(dialogo.getByLabelText("Lote de Yogur"), "   ");

        await user.click(dialogo.getByRole("button", { name: "Registrar recepción" }));

        const [yogur] = estado.recibidas[0]!.dto.items as Array<Record<string, unknown>>;
        expect(yogur).toEqual({ itemId: "yogur", quantity: 10, expiresAt: "2026-11-15" });
        expect(yogur!.lotCode).toBeUndefined();
    });

    it("si de la línea con lotes no llega nada ahora, no hace falta su fecha", async () => {
        const { user, dialogo } = await abrir();
        await user.clear(dialogo.getByLabelText("Llega ahora de Yogur"));

        expect(dialogo.queryByText("Indica cuándo caduca")).not.toBeInTheDocument();
        await user.click(dialogo.getByRole("button", { name: "Registrar recepción" }));

        expect(estado.recibidas[0]!.dto.items).toEqual([{ itemId: "tornillo", quantity: 5 }]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("la pantalla de caducidades", () => {
    const fila = (over: Partial<InformeDeCaducidades["data"][number]>): InformeDeCaducidades["data"][number] => ({
        lotId: "l", code: "L", expiresAt: "2026-10-20", daysLeft: 10, expired: false,
        productId: "p-yogur", productName: "Yogur", sku: "ALI-YOG", warehouseId: "w-central", warehouseName: "Tienda Central",
        stock: 1, unitCost: 2, costValue: 2, ...over,
    });
    const INFORME = informeDeCaducidadesSchema.parse({
        today: "2026-10-10",
        days: 30,
        summary: { expiredUnits: 6, expiredCostValue: 12, expiringUnits: 18, expiringCostValue: 36, unitsWithoutCost: 4 },
        data: [
            fila({ lotId: "l-viejo", code: "VIEJO", expiresAt: "2026-10-07", daysLeft: -3, expired: true, stock: 6, costValue: 12 }),
            fila({ lotId: "l-hoy", code: "HOY", expiresAt: "2026-10-10", daysLeft: 0, stock: 4, unitCost: null, costValue: null, productName: "Jamón", productId: "p-jamon" }),
            fila({ lotId: "l-bueno", code: "BUENO", expiresAt: "2026-10-22", daysLeft: 12, stock: 14, costValue: 28 }),
        ],
        meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
    });

    beforeEach(() => { estado.informe = INFORME; });

    it("separa lo ya caducado de lo que caduca en el plazo, con su valor, y dice lo que no suma", async () => {
        renderWithProviders(<CaducidadesPage />);

        const caducado = (await screen.findByText("Ya caducado")).parentElement!;
        expect(within(caducado).getByText("6 uds. · $12.00 a coste")).toBeInTheDocument();
        // Hay algo que retirar: se destaca.
        expect(within(caducado).getByText("6 uds. · $12.00 a coste")).toHaveClass("text-danger");
        expect(within(screen.getByText("Caduca en el plazo").parentElement!).getByText("18 uds. · $36.00 a coste")).toBeInTheDocument();
        expect(screen.getByText("4 unidades son de productos sin coste y no suman al valor.")).toBeInTheDocument();
    });

    it("cada fila dice su lote, su fecha y cuánto le queda con palabras, no solo con color", async () => {
        renderWithProviders(<CaducidadesPage />);

        const filas = (await screen.findAllByRole("listitem")).map((li) => li.textContent);
        expect(filas[0]).toContain("Lote VIEJO · 07 oct 2026");
        expect(filas[0]).toContain("Caducó hace 3 días");
        expect(filas[0]).toContain("$12.00 a coste");
        expect(filas[1]).toContain("Caduca hoy");
        // Sin coste se dice: cero sería un dato.
        expect(filas[1]).toContain("Sin coste conocido");
        expect(filas[2]).toContain("Caduca en 12 días");
        // Con un solo almacén no hay cuál decir.
        expect(filas[0]).not.toContain("Tienda Central");
    });

    it("abre con el plazo de Configuración y pide otro al cambiarlo, desde la primera página", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CaducidadesPage />);

        const plazo = await screen.findByRole("combobox", { name: "Caduca en los próximos" });
        await waitFor(() => expect(plazo).toHaveValue("30"));
        // Sin `days`: el plazo lo decide el servidor.
        expect(estado.consultas[0]).toEqual({ page: 1, limit: 50, warehouseId: undefined, days: undefined });

        await user.selectOptions(plazo, "7");

        await waitFor(() => expect(estado.consultas.at(-1)).toEqual({ page: 1, limit: 50, warehouseId: undefined, days: 7 }));
    });

    it("un plazo de Configuración que no está entre los ofrecidos se añade a la lista", async () => {
        estado.informe = { ...INFORME, days: 45 };
        renderWithProviders(<CaducidadesPage />);

        const plazo = await screen.findByRole("combobox", { name: "Caduca en los próximos" });
        await waitFor(() => expect(plazo).toHaveValue("45"));
        expect(within(plazo).getAllByRole("option").map((o) => o.textContent)).toEqual(["7 días", "15 días", "30 días", "45 días", "60 días", "90 días"]);
    });

    it("solo lo caducado se da de baja, y es un ajuste a cero de ese lote en ese almacén", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CaducidadesPage />);

        // Uno solo: el que caduca hoy y el vigente todavía se venden.
        const botones = await screen.findAllByRole("button", { name: /^Dar de baja el lote/ });
        expect(botones).toHaveLength(1);
        await user.click(screen.getByRole("button", { name: "Dar de baja el lote VIEJO de Yogur en Tienda Central" }));

        const dialogo = within(screen.getByRole("dialog", { name: "Dar de baja un lote caducado" }));
        expect(dialogo.getByText(/Se retiran del inventario 6 uds\. del lote VIEJO de «Yogur» en Tienda Central/)).toBeInTheDocument();
        expect(estado.movimientos).toHaveLength(0);
        await user.click(dialogo.getByRole("button", { name: "Dar de baja" }));

        await waitFor(() => expect(estado.movimientos).toHaveLength(1));
        expect(estado.movimientos[0]).toEqual({
            productId: "p-yogur",
            dto: { type: "ADJUSTMENT", quantity: 0, lotId: "l-viejo", warehouseId: "w-central", reason: "Caducado" },
        });
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });

    it("cancelar la confirmación no da de baja nada", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CaducidadesPage />);

        await user.click(await screen.findByRole("button", { name: /^Dar de baja el lote VIEJO/ }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        expect(estado.movimientos).toHaveLength(0);
    });

    it.each(["USER", "SELLER"] satisfies Rol[])("un %s lo lee, pero no puede dar de baja", async (rol) => {
        estado.rol = rol;
        renderWithProviders(<CaducidadesPage />);

        expect(await screen.findByText("Caducó hace 3 días")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^Dar de baja/ })).not.toBeInTheDocument();
    });

    it("el almacén da de baja: es quien va a retirarlo", async () => {
        estado.rol = "WAREHOUSE";
        renderWithProviders(<CaducidadesPage />);

        expect(await screen.findByRole("button", { name: /^Dar de baja el lote VIEJO/ })).toBeInTheDocument();
    });

    it("sin nada que enseñar lo dice", async () => {
        estado.informe = { ...INFORME, data: [], meta: { ...INFORME.meta, total: 0 }, summary: { expiredUnits: 0, expiredCostValue: 0, expiringUnits: 0, expiringCostValue: 0, unitsWithoutCost: 0 } };
        renderWithProviders(<CaducidadesPage />);

        expect(await screen.findByText("Nada caducado ni por caducar en ese plazo.")).toBeInTheDocument();
        expect(screen.queryByText(/no suman al valor/)).not.toBeInTheDocument();
        // Sin nada caducado, el cero no va en rojo: no hay nada que hacer.
        expect(within(screen.getByText("Ya caducado").parentElement!).getByText("0 uds. · $0.00 a coste")).not.toHaveClass("text-danger");
    });

    it("con varios almacenes, la fila dice en cuál está y se puede filtrar por uno", async () => {
        estado.almacenes = [CENTRAL, NORTE];
        const user = userEvent.setup();
        renderWithProviders(<CaducidadesPage />);

        expect((await screen.findAllByRole("listitem"))[0]!.textContent).toContain("Tienda Central");
        await user.selectOptions(await screen.findByRole("combobox", { name: "Almacén" }), "w-norte");

        await waitFor(() => expect(estado.consultas.at(-1)).toMatchObject({ warehouseId: "w-norte", page: 1 }));
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("los lotes de un producto en su ficha", () => {
    it("en el orden en que salen: lo que no tiene lote primero, y cada lote con su fecha y lo que le queda", async () => {
        renderWithProviders(<LotesDelProducto productId="p-yogur" />);

        const filas = (await screen.findAllByRole("listitem")).map((li) => li.textContent);
        expect(filas).toEqual([
            "Sin lote2",
            "VIEJO407 oct 2026Caducó hace 3 días",
            "BUENO822 oct 2026Caduca en 12 días",
        ]);
    });

    it("con varios almacenes dice dónde está cada lote", async () => {
        estado.almacenes = [CENTRAL, NORTE];
        renderWithProviders(<LotesDelProducto productId="p-yogur" />);

        expect(await screen.findByText("Tienda Central: 5 · Sucursal Norte: 3")).toBeInTheDocument();
    });

    it("sin existencias en ningún lote, lo dice", async () => {
        estado.lotes = { lots: [], withoutLot: 0 };
        renderWithProviders(<LotesDelProducto productId="p-yogur" />);

        expect(await screen.findByText("No hay existencias en ningún lote.")).toBeInTheDocument();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("la ficha del producto", () => {
    const conCifras = (over: Partial<ProductWithAvailability>): ProductWithAvailability => ({
        ...producto(), committedStock: 0, expiredStock: 0, availableStock: 14, abcClass: "C", stockLevels: [], ...over,
    });

    it("dice cuánto de su stock ha caducado, y enseña sus lotes", async () => {
        renderWithProviders(<ProductDetailModal product={conCifras({ expiredStock: 4, availableStock: 10 })} onClose={vi.fn()} onEdit={vi.fn()} />);
        const ficha = within(screen.getByRole("dialog"));

        expect(ficha.getByText("4 unidades caducadas, que no se pueden vender")).toBeInTheDocument();
        expect(ficha.getByText("Lotes, por orden de salida")).toBeInTheDocument();
        expect(await ficha.findByText("Caducó hace 3 días")).toBeInTheDocument();
    });

    it("sin nada caducado no lo dice, y un producto sin lotes no enseña la lista", () => {
        renderWithProviders(<ProductDetailModal product={conCifras({ tracksLots: false })} onClose={vi.fn()} onEdit={vi.fn()} />);
        const ficha = within(screen.getByRole("dialog"));

        expect(ficha.queryByText(/caducad/)).not.toBeInTheDocument();
        expect(ficha.queryByText("Lotes, por orden de salida")).not.toBeInTheDocument();
    });

    it("con varios almacenes, el que tiene algo caducado dice cuánto le queda disponible", async () => {
        estado.almacenes = [CENTRAL, NORTE];
        renderWithProviders(
            <ProductDetailModal
                product={conCifras({
                    expiredStock: 4, availableStock: 10,
                    stockLevels: [
                        { warehouseId: "w-central", stock: 11, expiredStock: 4, committedStock: 0, availableStock: 7 },
                        { warehouseId: "w-norte", stock: 3, expiredStock: 0, committedStock: 0, availableStock: 3 },
                    ],
                })}
                onClose={vi.fn()}
                onEdit={vi.fn()}
            />,
        );
        const ficha = within(screen.getByRole("dialog"));

        const central = (await ficha.findByText("Tienda Central")).closest("li")!;
        expect(central).toHaveTextContent("11 · 7 disponibles");
        // El que no tiene nada caducado ni comprometido no repite su stock.
        expect(ficha.getByText("Sucursal Norte").closest("li")).not.toHaveTextContent("disponibles");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("cuánto le queda a un lote", () => {
    const en = (idioma: "es" | "en") => ({
        t: (clave: Parameters<typeof traducir>[1], valores?: Parameters<typeof traducir>[2]) => traducir(idioma, clave, valores),
        tn: (clave: Parameters<typeof traducirCantidad>[1], cantidad: number) => traducirCantidad(idioma, clave, cantidad),
    });

    it("se dice con palabras, en singular y en plural, y en los dos idiomas", () => {
        expect([-2, -1, 0, 1, 9].map((d) => cuandoCaduca(en("es"), d))).toEqual([
            "Caducó hace 2 días", "Caducó hace 1 día", "Caduca hoy", "Caduca en 1 día", "Caduca en 9 días",
        ]);
        expect([-2, -1, 0, 1, 9].map((d) => cuandoCaduca(en("en"), d))).toEqual([
            "Expired 2 days ago", "Expired 1 day ago", "Expires today", "Expires in 1 day", "Expires in 9 days",
        ]);
    });

    it("el color acompaña: rojo lo caducado, ámbar lo de esta semana —hoy incluido—, neutro lo demás", () => {
        expect([-1, 0, 7, 8].map(tonoDeCaducidad)).toEqual(["danger", "warning", "warning", "neutral"]);
    });
});
