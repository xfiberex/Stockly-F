import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import PurchaseOrdersPage from "@/modules/purchase-orders/components/PurchaseOrdersPage";
import type { PurchaseOrder } from "@/modules/purchase-orders/types/purchase-orders.types";

// T2-19: la página tenía cubierta solo la paginación (T2-04). Lo que faltaba es lo que
// más lógica tiene y lo que mueve inventario: el formulario de array dinámico y las
// transiciones de estado, que en compras **suman stock** al recibir y lo restan al
// cancelar una recibida (T0-04).

// T5-01: `costPrice` es parte del contrato del producto, y `null` es «sin coste conocido».
const PRODUCTOS = [
    { id: "prod-1", name: "Teclado Logitech", price: 450, costPrice: null },
    { id: "prod-2", name: "Monitor LG", price: 3200, costPrice: null },
    { id: "prod-3", name: "Ratón MX", price: 1200, costPrice: "830.5" },
];

function orden(over: Partial<PurchaseOrder> = {}): PurchaseOrder {
    return {
        id: "aaaaaaaa-1111-2222-3333-444444444444",
        supplierId: null,
        supplier: null,
        status: "PENDING",
        notes: null,
        items: [
            { id: "i1", productId: "prod-1", productName: "Teclado Logitech", quantity: 4, unitPrice: 450 },
        ],
        createdAt: "2026-08-09T10:00:00.000Z",
        updatedAt: "2026-08-09T10:00:00.000Z",
        ...over,
    } as PurchaseOrder;
}

let ordenes: PurchaseOrder[] = [];
const creadas: unknown[] = [];
const actualizadas: unknown[] = [];
const borradas: string[] = [];

vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    usePurchaseOrders: () => ({
        data: { data: ordenes, meta: { total: ordenes.length, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
    }),
    useCreatePurchaseOrder: () => ({
        mutate: (dto: unknown, opciones?: { onSuccess?: () => void }) => {
            creadas.push(dto);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
    useUpdatePurchaseOrder: () => ({
        // Como la mutación real en el caso feliz: invoca `onSuccess`, que es lo que cierra
        // el diálogo de cancelación de una orden recibida (T5-01).
        mutate: (vars: unknown, opciones?: { onSuccess?: () => void }) => {
            actualizadas.push(vars);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
    useDeletePurchaseOrder: () => ({
        mutate: (id: string, opciones?: { onSuccess?: () => void }) => {
            borradas.push(id);
            opciones?.onSuccess?.();
        },
        isPending: false,
    }),
}));

let rol: "ADMIN" | "USER" = "ADMIN";

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: rol } }),
}));

vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({
    useSuppliers: () => ({ data: [{ id: "sup-1", name: "Proveedor Uno" }], isLoading: false }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: PRODUCTOS, meta: { total: 2, page: 1, limit: 200, totalPages: 1 } } }),
}));

async function abrirFormulario(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /Nueva orden/ }));
    return screen.getByRole("dialog");
}

describe("PurchaseOrdersPage — formulario (T2-19)", () => {
    beforeEach(() => {
        ordenes = [];
        creadas.length = 0;
        actualizadas.length = 0;
        borradas.length = 0;
    });

    it("elegir un producto rellena su nombre y su precio", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        const dialogo = await abrirFormulario(user);

        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "prod-2");

        expect(within(dialogo).getByLabelText("Nombre")).toHaveValue("Monitor LG");
        expect(within(dialogo).getByLabelText("P. unit.")).toHaveValue(3200);
    });

    it("con coste conocido propone el coste, no el precio de venta (T5-01)", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        const dialogo = await abrirFormulario(user);

        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "prod-3");

        // Lo que se escriba aquí es lo que la recepción promediará: proponer los 1200 de
        // venta subiría el coste medio sin que nadie lo hubiera decidido.
        expect(within(dialogo).getByLabelText("P. unit.")).toHaveValue(830.5);
    });

    it("se pueden añadir y quitar ítems, y el último no se puede quitar", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        const dialogo = await abrirFormulario(user);

        // El formulario abre con una fila puesta, y su botón de quitar nace inhabilitado
        // para que no pueda quedarse una orden sin ítems.
        expect(within(dialogo).getAllByLabelText("Nombre")).toHaveLength(1);

        await user.click(within(dialogo).getByRole("button", { name: /Agregar ítem/ }));
        expect(within(dialogo).getAllByLabelText("Nombre")).toHaveLength(2);
    });

    it("un ítem sin nombre no deja enviar la orden", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        const dialogo = await abrirFormulario(user);

        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(await within(dialogo).findByText("Obligatorio")).toBeInTheDocument();
        expect(creadas).toHaveLength(0);
    });

    it("envía cantidades y precios como números, no como el texto del input", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        const dialogo = await abrirFormulario(user);

        await user.selectOptions(within(dialogo).getByLabelText("Proveedor"), "sup-1");
        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "prod-1");
        await user.clear(within(dialogo).getByLabelText("Cant."));
        await user.type(within(dialogo).getByLabelText("Cant."), "7");
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect(creadas).toHaveLength(1);
        expect(creadas[0]).toMatchObject({
            supplierId: "sup-1",
            items: [{ productId: "prod-1", productName: "Teclado Logitech", quantity: 7, unitPrice: 450 }],
        });
    });

    it("un proveedor sin elegir viaja como `undefined`, no como cadena vacía", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);
        const dialogo = await abrirFormulario(user);

        await user.selectOptions(within(dialogo).getByLabelText("Producto"), "prod-1");
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        expect((creadas[0] as { supplierId?: string }).supplierId).toBeUndefined();
    });
});

describe("PurchaseOrdersPage — estados y acciones (T2-19)", () => {
    beforeEach(() => {
        rol = "ADMIN";
        ordenes = [orden()];
        creadas.length = 0;
        actualizadas.length = 0;
        borradas.length = 0;
    });

    it("una orden pendiente ofrece recibir, cancelar y eliminar", () => {
        renderWithProviders(<PurchaseOrdersPage />);

        expect(screen.getByText("Pendiente")).toBeInTheDocument();
        expect(screen.getByTitle("Marcar como recibida")).toBeInTheDocument();
        expect(screen.getByTitle("Cancelar orden")).toBeInTheDocument();
        expect(screen.getByTitle("Eliminar")).toBeInTheDocument();
    });

    it("recibir la orden pide la transición a RECEIVED", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(screen.getByTitle("Marcar como recibida"));

        expect(actualizadas).toEqual([{ id: orden().id, dto: { status: "RECEIVED" } }]);
    });

    it("cancelar pide la transición a CANCELLED", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(screen.getByTitle("Cancelar orden"));

        expect(actualizadas).toEqual([{ id: orden().id, dto: { status: "CANCELLED" } }]);
    });

    it("eliminar una orden la borra por su id", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(screen.getByTitle("Eliminar"));

        expect(borradas).toEqual([orden().id]);
    });

    it("una orden recibida no ofrece recibir, ni la cancelación directa, ni eliminar", () => {
        ordenes = [orden({ status: "RECEIVED" })];
        renderWithProviders(<PurchaseOrdersPage />);

        expect(screen.getByText("Recibida")).toBeInTheDocument();
        expect(screen.queryByTitle("Marcar como recibida")).not.toBeInTheDocument();
        // La de un clic es la de las pendientes; la recibida va por el diálogo (T5-01).
        expect(screen.queryByTitle("Cancelar orden")).not.toBeInTheDocument();
        expect(screen.queryByTitle("Eliminar")).not.toBeInTheDocument();
    });

    it("desplegar una orden muestra sus ítems y el total", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(screen.getByText(/Orden #/));

        // 4 × 450 = 1800, con el formato único de T2-44.
        expect(screen.getAllByText("$1,800.00").length).toBeGreaterThan(0);
        expect(screen.getByText("Teclado Logitech")).toBeInTheDocument();
    });

    it("una orden cancelada no ofrece ninguna acción", () => {
        ordenes = [orden({ status: "CANCELLED" })];
        renderWithProviders(<PurchaseOrdersPage />);

        expect(screen.queryAllByRole("button", { name: /Cancelar|Eliminar|recibida/ })).toHaveLength(0);
    });

    it("sin órdenes lo dice en vez de dejar la lista vacía", () => {
        ordenes = [];
        renderWithProviders(<PurchaseOrdersPage />);

        expect(screen.getByText(/No hay órdenes de compra/)).toBeInTheDocument();
    });
});
