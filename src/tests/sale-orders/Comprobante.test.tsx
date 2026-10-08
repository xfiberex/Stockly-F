import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import SaleOrdersPage from "@/modules/sale-orders/components/SaleOrdersPage";
import { es } from "@/shared/i18n/es";
import { en } from "@/shared/i18n/en";
import type { Rol } from "@/shared/contratos";
import type { SaleOrder } from "@/modules/sale-orders/types/sale-orders.types";

/**
 * T6-07 — el comprobante de venta, desde el detalle de la orden.
 *
 * El PDF lo hace el servidor; aquí se vigila **a quién se le ofrece** —solo a las órdenes que lo
 * tienen: las enviadas y las anuladas después de enviarse— y **cómo se pide**: por
 * `descargarDeLaApi`, con su ruta y su nombre de archivo, y no con un enlace a la API.
 */

const descargas = vi.hoisted(() => ({ descargarDeLaApi: vi.fn() }));
vi.mock("@/shared/api/descargar", () => descargas);

const ENVIADA: SaleOrder = {
    id: "aaaaaaaa-1111-2222-3333-444444444444",
    number: 41,
    status: "SHIPPED",
    customerId: null,
    customerName: "Cliente",
    customerEmail: null,
    customerPhone: null,
    customerDocument: null,
    createdByEmail: "admin@stockly.app",
    shippedAt: "2026-10-08T15:00:00.000Z",
    notes: null,
    items: [{
        id: "i1", saleOrderId: "aaaaaaaa-1111-2222-3333-444444444444", productId: null, product: null, productName: "Servicio",
        quantity: 1, unitPrice: "100.00", taxRate: 18, subtotal: "100.00", tax: "18.00", total: "118.00", createdAt: "2026-10-08T10:00:00.000Z",
    }],
    subtotal: "100.00",
    tax: "18.00",
    total: "118.00",
    createdAt: "2026-10-08T10:00:00.000Z",
    updatedAt: "2026-10-08T15:00:00.000Z",
};

let ordenes: SaleOrder[] = [];
let rol: Rol = "ADMIN";

vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: () => ({
        data: { data: ordenes, meta: { total: ordenes.length, page: 1, limit: 10, totalPages: 1 } },
        isLoading: false,
    }),
    useCreateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdateSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useShipSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeleteSaleOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/settings/hooks/useNegocio", () => ({
    useNegocio: () => ({ data: { taxName: "ITBIS" } }),
}));

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Alguien", role: rol } }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [] } }),
}));

const boton = () => screen.queryByRole("button", { name: "Descargar comprobante" });

/** Pinta la página con `orden` y despliega su detalle. */
async function abrir(orden: SaleOrder) {
    ordenes = [orden];
    const user = userEvent.setup();
    renderWithProviders(<SaleOrdersPage />);
    await user.click(screen.getByText(`Venta #${String(orden.number).padStart(6, "0")}`));
    return user;
}

describe("SaleOrdersPage — comprobante de venta (T6-07)", () => {
    beforeEach(() => {
        rol = "ADMIN";
        descargas.descargarDeLaApi.mockReset().mockResolvedValue(true);
    });

    it("una venta enviada lo ofrece en su detalle, y lo pide por su ruta con su nombre de archivo", async () => {
        ordenes = [ENVIADA];
        const user = userEvent.setup();
        renderWithProviders(<SaleOrdersPage />);

        // Con la fila plegada no está: es del detalle.
        expect(boton()).not.toBeInTheDocument();
        await user.click(screen.getByText("Venta #000041"));
        await user.click(boton()!);

        expect(descargas.descargarDeLaApi).toHaveBeenCalledTimes(1);
        expect(descargas.descargarDeLaApi).toHaveBeenCalledWith(`/sale-orders/${ENVIADA.id}/receipt`, {}, "comprobante-000041.pdf");
    });

    it("es un botón que descarga, no un enlace a la API", async () => {
        await abrir(ENVIADA);

        expect(boton()).toHaveAttribute("type", "button");
        expect(screen.queryAllByRole("link").filter((a) => a.getAttribute("href")?.includes("receipt"))).toEqual([]);
    });

    it("una pendiente no lo ofrece: todavía no es una venta", async () => {
        await abrir({ ...ENVIADA, status: "PENDING", shippedAt: null });

        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(boton()).not.toBeInTheDocument();
    });

    it("una cancelada sin haberse enviado, tampoco", async () => {
        await abrir({ ...ENVIADA, status: "CANCELLED", shippedAt: null });

        expect(boton()).not.toBeInTheDocument();
    });

    it("una cancelada después de enviarse lo conserva", async () => {
        const user = await abrir({ ...ENVIADA, status: "CANCELLED" });

        await user.click(boton()!);

        expect(descargas.descargarDeLaApi).toHaveBeenCalledWith(`/sale-orders/${ENVIADA.id}/receipt`, {}, "comprobante-000041.pdf");
    });

    it.each(["USER", "WAREHOUSE"] as const)("un %s también lo descarga: lo lee quien lee la venta", async (quien) => {
        rol = quien;
        const user = await abrir(ENVIADA);

        await user.click(boton()!);

        expect(descargas.descargarDeLaApi).toHaveBeenCalledTimes(1);
    });

    it("mientras llega el PDF no admite un segundo clic, y después vuelve a estar disponible", async () => {
        let terminar!: (ok: boolean) => void;
        descargas.descargarDeLaApi.mockReturnValue(new Promise<boolean>((ok) => { terminar = ok; }));
        const user = await abrir(ENVIADA);

        await user.click(boton()!);
        expect(boton()).toBeDisabled();
        await user.click(boton()!);
        expect(descargas.descargarDeLaApi).toHaveBeenCalledTimes(1);

        terminar(true);
        await waitFor(() => expect(boton()).toBeEnabled());
    });
});

describe("El comprobante no se llama como el documento fiscal (decidido el 2026-10-05)", () => {
    // No tiene valor fiscal. `facturación`, la de la clasificación ABC, es otra palabra: lo que
    // el negocio vende, no el papel.
    const PROHIBIDA = /\bfacturas?\b|\binvoices?\b/i;

    it.each([["es", es], ["en", en]] as const)("ningún texto del catálogo %s la usa", (_idioma, catalogo) => {
        const conLaPalabra = Object.entries(catalogo).filter(([, texto]) => PROHIBIDA.test(texto)).map(([clave]) => clave);

        expect(conLaPalabra).toEqual([]);
    });

    it("los textos del comprobante dicen «comprobante» y «receipt»", () => {
        expect(es["ventas.comprobante.descargar"]).toBe("Descargar comprobante");
        expect(en["ventas.comprobante.descargar"]).toBe("Download receipt");
    });
});
