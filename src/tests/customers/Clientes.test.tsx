import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithProviders } from "@/tests/utils";
import CustomersPage from "@/modules/customers/components/CustomersPage";
import CustomerDetailPage from "@/modules/customers/components/CustomerDetailPage";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import { formatearImporte } from "@/shared/lib/moneda";
import type { Paginado, Rol } from "@/shared/contratos";
import type { CustomerDetail, CustomerListItem } from "@/modules/customers/types/customer.types";
import type { SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";

// T5-06 — clientes: la lista, la ficha y el buscador del formulario de venta.

const ANA: CustomerListItem = {
    id: "c1111111-1111-4111-8111-111111111111",
    name: "Ana Soto",
    email: "ana@correo.com",
    phone: "555-0100",
    notes: null,
    ordersCount: 2,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
};

const VEGA: CustomerListItem = {
    ...ANA,
    id: "c2222222-2222-4222-8222-222222222222",
    name: "Distribuidora Vega",
    email: "compras@vega.mx",
    phone: null,
    ordersCount: 0,
};

const paginado = <T,>(data: T[]): Paginado<T> => ({ data, meta: { total: data.length, page: 1, limit: 20, totalPages: 1 } });

let rol: Rol = "ADMIN";
let clientes: CustomerListItem[] = [];
let ficha: CustomerDetail | null = null;
let ordenesDelCliente: SaleOrder[] = [];

const api = vi.hoisted(() => ({
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getSaleOrders: vi.fn(),
    createSaleOrder: vi.fn(),
}));

vi.mock("@/modules/customers/api/customers.api", () => ({ CustomersAPI: api }));

vi.mock("@/modules/sale-orders/api/sale-orders.api", () => ({
    getSaleOrders: api.getSaleOrders,
    createSaleOrder: api.createSaleOrder,
    updateSaleOrder: vi.fn(),
    shipSaleOrder: vi.fn(),
    deleteSaleOrder: vi.fn(),
    exportSaleOrdersCsv: vi.fn(),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: rol } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

beforeEach(() => {
    rol = "ADMIN";
    clientes = [ANA, VEGA];
    ficha = null;
    ordenesDelCliente = [];
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getAll.mockImplementation(async () => paginado(clientes));
    api.getById.mockImplementation(async () => {
        if (!ficha) throw new Error("404");
        return ficha;
    });
    api.getSaleOrders.mockImplementation(async () => paginado(ordenesDelCliente));
    api.update.mockResolvedValue(ANA);
    api.delete.mockResolvedValue(undefined);
    api.createSaleOrder.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────
describe("CustomersPage", () => {
    it("lista los clientes con el enlace a su ficha y cuántas órdenes tienen", async () => {
        renderWithProviders(<CustomersPage />);

        const enlace = await screen.findByRole("link", { name: "Ana Soto" });
        expect(enlace).toHaveAttribute("href", `/customers/${ANA.id}`);
        expect(screen.getByText("2 clientes")).toBeInTheDocument();
        const fila = enlace.closest("tr")!;
        expect(within(fila).getByText("ana@correo.com")).toBeInTheDocument();
        expect(within(fila).getByText("2")).toBeInTheDocument();
    });

    it("ADMIN puede crear, editar y borrar; cada botón nombra a su cliente", async () => {
        renderWithProviders(<CustomersPage />);
        await screen.findByRole("link", { name: "Ana Soto" });

        expect(screen.getByRole("button", { name: "Nuevo cliente" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Editar a Ana Soto" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Eliminar a Distribuidora Vega" })).toBeInTheDocument();
    });

    it.each<Rol>(["USER", "WAREHOUSE"])("%s consulta, pero no crea, edita ni borra", async (r) => {
        rol = r;
        renderWithProviders(<CustomersPage />);
        await screen.findByRole("link", { name: "Ana Soto" });

        expect(screen.queryByRole("button", { name: "Nuevo cliente" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^Editar a/ })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /^Eliminar a/ })).not.toBeInTheDocument();
    });

    it("busca en el servidor con lo escrito, desde la primera página", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CustomersPage />);
        await screen.findByRole("link", { name: "Ana Soto" });

        await user.type(screen.getByRole("searchbox", { name: "Buscar por nombre, correo o teléfono" }), "vega");

        await waitFor(() => expect(api.getAll).toHaveBeenLastCalledWith({ page: 1, limit: 20, search: "vega" }));
    });

    it("sin clientes, explica que se crean solos al vender con correo", async () => {
        clientes = [];
        renderWithProviders(<CustomersPage />);

        expect(await screen.findByText(/Se crean solos al vender con un correo/)).toBeInTheDocument();
    });

    it("borrar pide confirmación y avisa de que sus órdenes se quedan", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CustomersPage />);

        await user.click(await screen.findByRole("button", { name: "Eliminar a Ana Soto" }));
        const dialogo = screen.getByRole("dialog");
        expect(within(dialogo).getByText(/Sus órdenes de venta no se borran/)).toBeInTheDocument();
        expect(within(dialogo).getByText("Tiene 2 órdenes.")).toBeInTheDocument();
        expect(api.delete).not.toHaveBeenCalled();

        await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

        await waitFor(() => expect(api.delete).toHaveBeenCalledWith(ANA.id, expect.anything()));
    });

    it("editar manda los cuatro campos, vacíos incluidos: así se borra un teléfono", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CustomersPage />);

        await user.click(await screen.findByRole("button", { name: "Editar a Ana Soto" }));
        await user.clear(screen.getByLabelText("Teléfono"));
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        await waitFor(() =>
            expect(api.update).toHaveBeenCalledWith(
                { id: ANA.id, form: { name: "Ana Soto", email: "ana@correo.com", phone: "", notes: "" } },
                expect.anything(),
            ),
        );
    });

    it("un correo mal escrito se señala en el campo, en el idioma de la aplicación", async () => {
        const user = userEvent.setup();
        renderWithProviders(<CustomersPage />);

        await user.click(await screen.findByRole("button", { name: "Nuevo cliente" }));
        await user.type(screen.getByLabelText("Nombre *"), "Beto");
        await user.type(screen.getByLabelText("Correo"), "no-es-correo");
        await user.click(screen.getByRole("button", { name: "Guardar" }));

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(api.create).not.toHaveBeenCalled();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("CustomerDetailPage", () => {
    const renderFicha = () =>
        renderWithProviders(
            <Routes>
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
            </Routes>,
            { initialRoute: `/customers/${ANA.id}` },
        );

    const orden = (id: string, status: SaleOrder["status"], nombre: string, precio: string): SaleOrder => ({
        id,
        number: Number(id.slice(-3)),
        status,
        customerId: ANA.id,
        customerName: nombre,
        customerEmail: null,
        customerPhone: null,
        notes: null,
        items: [{ id: `i-${id}`, saleOrderId: id, productId: null, product: null, productName: "Algo", quantity: 2, unitPrice: precio, createdAt: "2026-09-01T10:00:00.000Z" }],
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
    });

    it("enseña sus cifras —el importe, solo de lo enviado— y su historial con el nombre de cada venta", async () => {
        ficha = {
            ...ANA,
            summary: { orders: 3, pending: 1, shipped: 2, cancelled: 0, shippedRevenue: 1234.5, lastOrderAt: "2026-09-20T10:00:00.000Z" },
        };
        ordenesDelCliente = [
            orden("aaaaaaaa-0000-4000-8000-000000000001", "SHIPPED", "Ana S.", "10.00"),
            orden("bbbbbbbb-0000-4000-8000-000000000002", "PENDING", "Ana Soto", "5.00"),
        ];

        renderFicha();

        expect(await screen.findByRole("heading", { name: "Ana Soto", level: 1 })).toBeInTheDocument();
        expect(screen.getByText("ana@correo.com")).toBeInTheDocument();
        expect(screen.getByText(formatearImporte(1234.5))).toBeInTheDocument();
        expect(screen.getByText("Importe enviado")).toBeInTheDocument();
        expect(screen.getByText(/1 pendiente todavía no cuenta/)).toBeInTheDocument();

        const historial = screen.getByRole("region", { name: "Historial de ventas" });
        // La instantánea: la venta dice a quién se vendió entonces, aunque hoy se llame distinto.
        expect(await within(historial).findByText("Ana S.")).toBeInTheDocument();
        expect(within(historial).getByText("Venta #000001")).toBeInTheDocument();
        expect(within(historial).getByText(formatearImporte(20))).toBeInTheDocument();
        expect(api.getSaleOrders).toHaveBeenCalledWith({ customerId: ANA.id, page: 1, limit: 10 });
    });

    it("un cliente que no existe lo dice, con el camino de vuelta", async () => {
        renderFicha();

        expect(await screen.findByText("Este cliente no existe o se ha eliminado.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Clientes" })).toHaveAttribute("href", "/customers");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("El cliente de una venta nueva", () => {
    async function abrirFormulario() {
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);
        await user.click(await screen.findByRole("button", { name: "Nueva orden" }));
        return { user, dialogo: screen.getByRole("dialog") };
    }

    it("con el teclado: flechas para moverse y Enter para elegir, sin enviar la venta", async () => {
        const { user, dialogo } = await abrirFormulario();
        const buscador = within(dialogo).getByRole("combobox", { name: "Cliente existente" });

        await user.click(buscador);
        await within(dialogo).findByRole("option", { name: /Distribuidora Vega/ });
        await user.keyboard("{ArrowDown}{Enter}");

        expect(api.createSaleOrder).not.toHaveBeenCalled();
        expect(within(dialogo).getByRole("button", { name: "Quitar el cliente Distribuidora Vega" })).toBeInTheDocument();
        // Rellena la instantánea, que sigue siendo editable.
        expect(within(dialogo).getByLabelText("Nombre del cliente")).toHaveValue("Distribuidora Vega");
        expect(within(dialogo).getByLabelText("Correo")).toHaveValue("compras@vega.mx");
    });

    it("la venta sale con el cliente elegido y los datos que se dejaron escritos", async () => {
        const { user, dialogo } = await abrirFormulario();

        await user.click(within(dialogo).getByRole("combobox", { name: "Cliente existente" }));
        await user.click(await within(dialogo).findByRole("option", { name: /Ana Soto/ }));
        await user.clear(within(dialogo).getByLabelText("Teléfono"));
        await user.type(within(dialogo).getByLabelText("Teléfono"), "999");
        await user.type(within(dialogo).getByLabelText("Nombre"), "Servicio");
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        await waitFor(() => expect(api.createSaleOrder).toHaveBeenCalled());
        expect(api.createSaleOrder.mock.calls[0]![0]).toMatchObject({
            customerId: ANA.id,
            customerName: "Ana Soto",
            customerEmail: "ana@correo.com",
            customerPhone: "999",
        });
    });

    it("quitar el cliente deja la venta sin `customerId`: la vinculará el servidor por su correo", async () => {
        const { user, dialogo } = await abrirFormulario();

        await user.click(within(dialogo).getByRole("combobox", { name: "Cliente existente" }));
        await user.click(await within(dialogo).findByRole("option", { name: /Ana Soto/ }));
        await user.click(within(dialogo).getByRole("button", { name: "Quitar el cliente Ana Soto" }));
        await user.type(within(dialogo).getByLabelText("Nombre"), "Servicio");
        await user.click(within(dialogo).getByRole("button", { name: "Crear orden" }));

        await waitFor(() => expect(api.createSaleOrder).toHaveBeenCalled());
        expect(api.createSaleOrder.mock.calls[0]![0].customerId).toBeUndefined();
    });

    it("Escape cierra la lista sin cerrar el diálogo", async () => {
        const { user, dialogo } = await abrirFormulario();
        const buscador = within(dialogo).getByRole("combobox", { name: "Cliente existente" });

        await user.click(buscador);
        await within(dialogo).findByRole("option", { name: /Ana Soto/ });
        expect(buscador).toHaveAttribute("aria-expanded", "true");

        await user.keyboard("{Escape}");

        expect(buscador).toHaveAttribute("aria-expanded", "false");
        expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("mientras llega la búsqueda nueva, Enter no elige un resultado de la anterior", async () => {
        // Visto en el E2E del móvil: la lista seguía enseñando los resultados de antes de
        // teclear, y un Enter rápido elegía el primero de ellos —que no era lo escrito—.
        const { user, dialogo } = await abrirFormulario();
        const buscador = within(dialogo).getByRole("combobox", { name: "Cliente existente" });
        await user.click(buscador);
        await within(dialogo).findByRole("option", { name: /Ana Soto/ });

        await user.type(buscador, "vega{Enter}");

        expect(within(dialogo).queryByRole("button", { name: /^Quitar el cliente/ })).not.toBeInTheDocument();
        expect(within(dialogo).queryByRole("option", { name: /Ana Soto/ })).not.toBeInTheDocument();
        expect(within(dialogo).getByText("Buscando…")).toBeInTheDocument();
    });

    it("busca en el servidor con lo que se escribe", async () => {
        const { user, dialogo } = await abrirFormulario();

        await user.type(within(dialogo).getByRole("combobox", { name: "Cliente existente" }), "ana");

        await waitFor(() => expect(api.getAll).toHaveBeenLastCalledWith({ search: "ana", limit: 8 }));
    });
});
