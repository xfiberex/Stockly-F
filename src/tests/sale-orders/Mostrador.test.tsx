import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import MostradorPage from "@/modules/sale-orders/components/MostradorPage";
import type { Rol } from "@/shared/contratos";
import type { CounterSaleDto, SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";

/**
 * T6-08 — el mostrador.
 *
 * Lo que se vigila: que lo que sale hacia el servidor sea **un producto y una cantidad por
 * línea, sin precio**; que la pantalla no deje registrar lo que el servidor va a rechazar; y que
 * lo que enseña después de vender sea lo que devolvió la venta, no su propia previsión.
 */

const PRODUCTOS = [
    { id: "p-teclado", name: "Teclado", price: "50", stock: 10, committedStock: 7, availableStock: 3, stockLevels: [], isActive: true },
    { id: "p-raton", name: "Ratón", price: "25.5", stock: 5, committedStock: 0, availableStock: 5, stockLevels: [], isActive: true },
];

const ANA = { id: "c-ana", name: "Ana Soto", email: "ana@correo.com", phone: null, document: "001-1", notes: null, ordersCount: 1 };

const estado = vi.hoisted(() => ({
    vendidas: [] as unknown[],
    /** Lo que devuelve la venta: a propósito, **no** lo que la pantalla habría sumado. */
    respuesta: null as unknown,
    falla: false,
    pendiente: false,
    porCodigo: vi.fn(),
    descargarDeLaApi: vi.fn(),
}));

let rol: Rol = "SELLER";
let negocio = { taxName: "ITBIS", taxRate: 0 };

vi.mock("@/shared/api/descargar", () => ({ descargarDeLaApi: estado.descargarDeLaApi }));

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useVentaDeMostrador: () => ({
        mutate: (dto: CounterSaleDto, opciones?: { onSuccess?: (orden: SaleOrder) => void }) => {
            estado.vendidas.push(dto);
            if (!estado.falla) opciones?.onSuccess?.(estado.respuesta as SaleOrder);
        },
        isPending: estado.pendiente,
    }),
}));

vi.mock("@/modules/settings/hooks/useNegocio", () => ({ useNegocio: () => ({ data: negocio }) }));
vi.mock("@/modules/auth/hooks/useMe", () => ({ useAuth: () => ({ user: { id: "u1", name: "Sofía", role: rol } }) }));
vi.mock("@/modules/products/hooks/useProducts", () => ({ useProducts: () => ({ data: { data: PRODUCTOS } }) }));
vi.mock("@/modules/products/hooks/useBuscarPorCodigo", () => ({ useBuscarPorCodigo: () => ({ buscar: estado.porCodigo, buscando: false }) }));
vi.mock("@/modules/customers/hooks/useCustomers", () => ({ useCustomers: () => ({ data: { data: [ANA] }, isPlaceholderData: false }) }));

// El escáner de verdad necesita cámara: aquí es un botón que «lee» un código fijo.
vi.mock("@/shared/components/EscanerModal", () => ({
    EscanerModal: ({ isOpen, onCodigo }: { isOpen: boolean; onCodigo: (codigo: string) => void }) =>
        isOpen ? <button onClick={() => onCodigo("7501234567890")}>leer código</button> : null,
}));

const ORDEN: SaleOrder = {
    id: "o-1", number: 123, status: "SHIPPED", warehouseId: "almacen-1", warehouse: { id: "almacen-1", name: "Principal" }, customerId: null, customerName: null, customerEmail: null, customerPhone: null,
    customerDocument: null, createdByEmail: "vendedor@stockly.app", shippedAt: "2026-10-08T15:00:00.000Z", notes: null, items: [],
    subtotal: "999.00", tax: "0.00", total: "999.00", createdAt: "2026-10-08T15:00:00.000Z", updatedAt: "2026-10-08T15:00:00.000Z",
};

function abrir() {
    const user = userEvent.setup();
    renderWithProviders(<MostradorPage />);
    return user;
}

async function anadir(user: ReturnType<typeof userEvent.setup>, nombre: RegExp) {
    await user.click(screen.getByRole("combobox", { name: "Producto" }));
    await user.click(await screen.findByRole("option", { name: nombre }));
}

const lineas = () => within(screen.getByRole("region", { name: "Productos de la venta" })).queryAllByRole("listitem");
const registrar = () => screen.getByRole("button", { name: "Registrar venta" });
/** El cuadro de lo que se va a cobrar, como texto: `Total$50.00`. */
const cobro = () => screen.getByText("Total").closest("dl")!.textContent;

describe("MostradorPage (T6-08)", () => {
    beforeEach(() => {
        rol = "SELLER";
        negocio = { taxName: "ITBIS", taxRate: 0 };
        estado.vendidas.length = 0;
        estado.respuesta = ORDEN;
        estado.falla = false;
        estado.pendiente = false;
        estado.porCodigo.mockReset();
        estado.descargarDeLaApi.mockReset().mockResolvedValue(true);
    });

    it("vacío, no hay nada que registrar", () => {
        abrir();

        expect(screen.getByText("Todavía no hay productos en esta venta.")).toBeInTheDocument();
        expect(registrar()).toBeDisabled();
        expect(cobro()).toBe("Total$0.00");
    });

    it("el criterio: dos productos, y lo que sale es un producto y una cantidad por línea, sin precio", async () => {
        const user = abrir();

        await anadir(user, /Teclado/);
        await anadir(user, /Ratón/);
        await user.click(screen.getByRole("button", { name: "Una unidad más de Ratón" }));

        expect(lineas()).toHaveLength(2);
        expect(within(lineas()[0]!).getByText("$50.00 por unidad")).toBeInTheDocument();
        // 50.00 + 2 × 25.50.
        expect(cobro()).toBe("Total$101.00");

        await user.click(registrar());

        expect(estado.vendidas).toEqual([{ customerId: undefined, items: [{ productId: "p-teclado", quantity: 1 }, { productId: "p-raton", quantity: 2 }] }]);
        // Ni precio ni nombre: los pone el servidor.
        expect(JSON.stringify(estado.vendidas)).not.toMatch(/price|unitPrice|productName/i);
    });

    it("después de vender enseña el número y el importe que devolvió la venta, no su previsión, y el comprobante se descarga", async () => {
        const user = abrir();
        await anadir(user, /Teclado/);
        expect(cobro()).toBe("Total$50.00");

        await user.click(registrar());

        const hecha = screen.getByRole("status");
        expect(within(hecha).getByText("Venta #000123 registrada")).toBeInTheDocument();
        // El servidor dijo 999.00; la pantalla habría dicho 50.00.
        expect(within(hecha).getByText("$999.00")).toBeInTheDocument();
        expect(screen.queryByText("$50.00")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Descargar comprobante" }));
        expect(estado.descargarDeLaApi).toHaveBeenCalledWith("/sale-orders/o-1/receipt", {}, "comprobante-000123.pdf");
    });

    it("«Nueva venta» vuelve a un mostrador vacío: ni las líneas ni el cliente de la anterior", async () => {
        const user = abrir();
        await anadir(user, /Teclado/);
        await user.click(screen.getByRole("combobox", { name: "Cliente existente" }));
        await user.click(await screen.findByRole("option", { name: /Ana Soto/ }));
        await user.click(registrar());

        await user.click(screen.getByRole("button", { name: "Nueva venta" }));

        expect(lineas()).toHaveLength(0);
        expect(registrar()).toBeDisabled();
        expect(screen.getByRole("combobox", { name: "Cliente existente" })).toHaveValue("");
    });

    it("con impuesto, la venta hecha lo desglosa con su nombre", async () => {
        estado.respuesta = { ...ORDEN, subtotal: "100.00", tax: "18.00", total: "118.00" };
        const user = abrir();
        await anadir(user, /Teclado/);

        await user.click(registrar());

        expect(within(screen.getByRole("status")).getByText("$100.00 más $18.00 de ITBIS")).toBeInTheDocument();
    });

    it("elegir otra vez el mismo producto suma una unidad: un producto, una línea", async () => {
        const user = abrir();

        await anadir(user, /Teclado/);
        await anadir(user, /Teclado/);

        expect(lineas()).toHaveLength(1);
        expect(screen.getByRole("spinbutton", { name: "Cantidad de Teclado" })).toHaveValue(2);
        expect(cobro()).toBe("Total$100.00");
    });

    it("pasarse de lo disponible lo dice en la línea y no deja registrar", async () => {
        const user = abrir();
        await anadir(user, /Teclado/);
        const cantidad = screen.getByRole("spinbutton", { name: "Cantidad de Teclado" });
        // Stock 10, pero 7 comprometidas: se pueden vender 3.
        expect(screen.getByText("Disponible: 3")).toBeInTheDocument();

        await user.clear(cantidad);
        await user.type(cantidad, "4");

        expect(screen.getByText("Solo hay 3 disponibles")).toHaveClass("text-danger");
        expect(cantidad).toHaveAttribute("aria-invalid", "true");
        expect(registrar()).toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Una unidad menos de Teclado" }));
        expect(registrar()).toBeEnabled();
        await user.click(registrar());
        expect(estado.vendidas).toMatchObject([{ items: [{ productId: "p-teclado", quantity: 3 }] }]);
    });

    it.each([["vacía", ""], ["a cero", "0"], ["con decimales", "1.5"]])("una cantidad %s no se registra", async (_caso, valor) => {
        const user = abrir();
        await anadir(user, /Ratón/);
        const cantidad = screen.getByRole("spinbutton", { name: "Cantidad de Ratón" });

        await user.clear(cantidad);
        if (valor) await user.type(cantidad, valor);

        expect(registrar()).toBeDisabled();
        await user.click(registrar());
        expect(estado.vendidas).toEqual([]);
    });

    it("no se baja de una unidad con el botón; para eso está quitar la línea", async () => {
        const user = abrir();
        await anadir(user, /Ratón/);

        expect(screen.getByRole("button", { name: "Una unidad menos de Ratón" })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Quitar Ratón de la venta" }));

        expect(lineas()).toHaveLength(0);
        expect(registrar()).toBeDisabled();
    });

    it("con la tasa al 18 % dice subtotal, impuesto con su nombre y su tasa, y total, redondeando por línea", async () => {
        negocio = { taxName: "ITBIS", taxRate: 18 };
        const user = abrir();

        await anadir(user, /Ratón/);

        // 25.50 al 18 % son 4.59.
        expect(cobro()).toBe("Subtotal$25.50ITBIS (18 %)$4.59Total$30.09");
    });

    it("sin nombre de impuesto en Configuración, el genérico", async () => {
        negocio = { taxName: "", taxRate: 10 };
        const user = abrir();

        await anadir(user, /Teclado/);

        expect(cobro()).toBe("Subtotal$50.00Impuesto (10 %)$5.00Total$55.00");
    });

    it("el cliente es opcional, y elegido viaja por su id", async () => {
        const user = abrir();
        await anadir(user, /Teclado/);

        await user.click(screen.getByRole("combobox", { name: "Cliente existente" }));
        await user.click(await screen.findByRole("option", { name: /Ana Soto/ }));
        await user.click(registrar());

        expect(estado.vendidas).toMatchObject([{ customerId: "c-ana" }]);
    });

    it("si la venta falla, las líneas siguen ahí para corregirlas", async () => {
        estado.falla = true;
        const user = abrir();
        await anadir(user, /Teclado/);

        await user.click(registrar());

        expect(estado.vendidas).toHaveLength(1);
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(lineas()).toHaveLength(1);
    });

    it("mientras se registra, el botón no admite otro clic", async () => {
        estado.pendiente = true;
        const user = abrir();
        await anadir(user, /Teclado/);

        expect(registrar()).toBeDisabled();
    });

    describe("el escáner", () => {
        const escanear = async (user: ReturnType<typeof userEvent.setup>) => {
            await user.click(screen.getByRole("button", { name: "Escanear" }));
            await user.click(screen.getByRole("button", { name: "leer código" }));
        };

        it("un código conocido añade su producto, y leerlo otra vez suma una unidad", async () => {
            estado.porCodigo.mockResolvedValue(PRODUCTOS[1]);
            const user = abrir();

            await escanear(user);
            await escanear(user);

            expect(estado.porCodigo).toHaveBeenCalledWith("7501234567890");
            expect(lineas()).toHaveLength(1);
            expect(screen.getByRole("spinbutton", { name: "Cantidad de Ratón" })).toHaveValue(2);
        });

        it("un código que no es de ningún producto lo dice y no añade nada", async () => {
            estado.porCodigo.mockResolvedValue(null);
            const user = abrir();

            await escanear(user);

            expect(screen.getByRole("alert")).toHaveTextContent("Ningún producto tiene el código «7501234567890».");
            expect(lineas()).toHaveLength(0);
        });

        it("un producto inactivo no se vende: se dice y no se añade", async () => {
            estado.porCodigo.mockResolvedValue({ ...PRODUCTOS[0], isActive: false });
            const user = abrir();

            await escanear(user);

            expect(screen.getByRole("alert")).toHaveTextContent("«Teclado» está inactivo y no se puede añadir.");
            expect(lineas()).toHaveLength(0);
        });

        it("el aviso se va al añadir un producto", async () => {
            estado.porCodigo.mockResolvedValue(null);
            const user = abrir();
            await escanear(user);

            await anadir(user, /Teclado/);

            expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        });
    });

    it("no es una tabla: es una lista, para una pantalla de móvil", async () => {
        const user = abrir();
        await anadir(user, /Teclado/);

        expect(screen.queryByRole("table")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Mostrador", level: 1 })).toBeInTheDocument();
    });
});
