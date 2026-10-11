import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import { CampanaDeAvisos } from "@/modules/notifications/components/CampanaDeAvisos";
import { avisosSchema } from "@/shared/contratos";
import { haceCuanto } from "@/shared/lib/fechas";
import type { Notification } from "@/modules/notifications/types/notification.types";

// T5-12 — la campana de avisos de la cabecera.

const api = vi.hoisted(() => ({
    getAll: vi.fn(),
    unreadCount: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
}));

vi.mock("@/modules/notifications/api/notifications.api", () => ({ NotificationsAPI: api }));

const HACE_UN_RATO = new Date(Date.now() - 5 * 60_000).toISOString();

const STOCK: Notification = {
    id: "a1", type: "LOW_STOCK", entityId: "prod-1", readAt: null, createdAt: HACE_UN_RATO,
    data: { productName: "Cable HDMI", stock: 4, minStock: 5 },
};
const VENTA: Notification = {
    id: "a2", type: "SALE_UNSHIPPABLE", entityId: "abcd1234-0000-4000-8000-000000000000", readAt: null, createdAt: HACE_UN_RATO,
    data: { productName: "Teclado", available: 3, required: 5 },
};
/** T6-04 — creado ya con el correlativo de la venta. Leído, para no mover el recuento. */
const VENTA_NUMERADA: Notification = {
    id: "a4", type: "SALE_UNSHIPPABLE", entityId: "ffff9999-0000-4000-8000-000000000000",
    readAt: "2026-09-29T10:00:00.000Z", createdAt: HACE_UN_RATO,
    data: { orderNumber: 123, productName: "Monitor", available: 0, required: 1 },
};
const COMPRA: Notification = {
    id: "a3", type: "PURCHASE_OVERDUE", entityId: "beef5678-0000-4000-8000-000000000000",
    readAt: "2026-09-29T10:00:00.000Z", createdAt: HACE_UN_RATO,
    data: { supplierName: "Rápido SA", dueDate: "2026-09-23" },
};

/** Lo que devuelve `GET /notifications`, comprobado contra el contrato antes de usarlo de mock. */
function lista(items: Notification[]) {
    return avisosSchema.parse({ items, unread: items.filter((a) => a.readAt === null).length });
}

function servidorCon(items: Notification[]) {
    const respuesta = lista(items);
    api.getAll.mockResolvedValue(respuesta);
    api.unreadCount.mockResolvedValue({ unread: respuesta.unread });
}

const campana = (nombre: string | RegExp = /^Avisos/) => screen.findByRole("button", { name: nombre });

async function abrir(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await campana());
    return screen.findByRole("dialog", { name: "Avisos" });
}

describe("CampanaDeAvisos (T5-12)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        servidorCon([STOCK, VENTA, COMPRA]);
    });

    describe("El contador", () => {
        it("el botón se llama con su número y la región viva lo anuncia", async () => {
            renderWithProviders(<CampanaDeAvisos />);

            // Un «2» sobre un icono no es un nombre: el número va en el nombre del botón.
            expect(await campana("Avisos: 2 sin leer")).toBeInTheDocument();
            const region = screen.getByText("Tienes 2 avisos sin leer");
            expect(region).toHaveAttribute("aria-live", "polite");
        });

        it("con uno, en singular", async () => {
            servidorCon([STOCK]);
            renderWithProviders(<CampanaDeAvisos />);

            expect(await screen.findByText("Tienes 1 aviso sin leer")).toBeInTheDocument();
        });

        it("sin avisos sin leer no hay número, y la región viva se queda vacía", async () => {
            servidorCon([COMPRA]);
            const { container } = renderWithProviders(<CampanaDeAvisos />);

            await waitFor(() => expect(api.unreadCount).toHaveBeenCalled());
            expect(await campana("Avisos")).toBeInTheDocument();
            expect(container.querySelector("[aria-live]")).toBeEmptyDOMElement();
        });

        it("por encima de 99 pinta «99+», pero el nombre dice la cifra", async () => {
            api.unreadCount.mockResolvedValue({ unread: 250 });
            renderWithProviders(<CampanaDeAvisos />);

            const boton = await campana("Avisos: 250 sin leer");
            expect(within(boton).getByText("99+")).toBeInTheDocument();
        });

        it("la lista no se pide hasta abrir el panel: el sondeo solo cuenta", async () => {
            renderWithProviders(<CampanaDeAvisos />);

            await campana("Avisos: 2 sin leer");
            expect(api.getAll).not.toHaveBeenCalled();
        });
    });

    describe("El panel", () => {
        it("se abre como diálogo, con el foco dentro, y compone cada aviso con sus huecos", async () => {
            const user = userEvent.setup();
            servidorCon([STOCK, VENTA, VENTA_NUMERADA, COMPRA]);
            renderWithProviders(<CampanaDeAvisos />);

            const panel = await abrir(user);

            expect(panel).toHaveFocus();
            expect(await campana()).toHaveAttribute("aria-expanded", "true");

            const stock = await within(panel).findByRole("link", { name: /Stock bajo: Cable HDMI/ });
            expect(stock).toHaveTextContent("Quedan 4; el mínimo es 5.");
            expect(stock).toHaveTextContent(haceCuanto("es", HACE_UN_RATO));
            expect(stock).toHaveAttribute("href", "/catalog/products/prod-1/movements");

            // Un aviso anterior a T6-04 no trae el correlativo: se sigue leyendo como se creó.
            const venta = within(panel).getByRole("link", { name: /La venta #ABCD1234 no se pudo enviar/ });
            expect(venta).toHaveTextContent("Teclado: hay 3 y la orden pide 5.");
            expect(venta).toHaveAttribute("href", "/sale-orders");
            // El que sí lo trae se nombra por él, con sus ceros.
            expect(within(panel).getByRole("link", { name: /La venta #000123 no se pudo enviar/ })).toBeInTheDocument();

            const compra = within(panel).getByRole("link", { name: /La compra #BEEF5678 pasó su plazo de entrega/ });
            expect(compra).toHaveTextContent("Rápido SA · vencía el 23 sep 2026");
            expect(compra).toHaveAttribute("href", "/purchase-orders");
        });

        it("«sin leer» se dice con palabras, no solo con el punto", async () => {
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);

            const panel = await abrir(user);

            expect(await within(panel).findByRole("link", { name: /^Sin leer: Stock bajo/ })).toBeInTheDocument();
            expect(within(panel).getByRole("link", { name: /^La compra/ })).toBeInTheDocument();
        });

        it("un producto agotado y una compra sin proveedor tienen su frase", async () => {
            servidorCon([
                { ...STOCK, data: { productName: "Cable HDMI", stock: 0, minStock: 5 } },
                { ...COMPRA, data: { supplierName: null, dueDate: "2026-09-23" } },
            ]);
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);

            const panel = await abrir(user);

            expect(await within(panel).findByText("Agotado; el mínimo es 5.")).toBeInTheDocument();
            expect(within(panel).getByText("Vencía el 23 sep 2026")).toBeInTheDocument();
        });

        it("un lote en plazo de aviso dice cuál, de qué producto y su fecha —sin afirmar si ya venció—, y lleva al informe (T5-15)", async () => {
            servidorCon([{
                id: "a9", type: "LOT_EXPIRING", entityId: "lote-1", readAt: null, createdAt: HACE_UN_RATO,
                data: { productName: "Yogur", lotCode: "L-20261020", expiresAt: "2026-10-20", units: 18 },
            }]);
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);

            const panel = await abrir(user);

            const aviso = (await within(panel).findByText("Revisa la caducidad del lote L-20261020 de Yogur")).closest("a")!;
            // El día que dice el aviso es el del lote, no el anterior: es un día, no un instante.
            expect(within(aviso).getByText("Fecha de caducidad: 20 oct 2026 · 18 uds. en el almacén")).toBeInTheDocument();
            expect(aviso).toHaveAttribute("href", "/expiry");
        });

        it("Escape lo cierra y devuelve el foco a la campana", async () => {
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);
            await abrir(user);

            await user.keyboard("{Escape}");

            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            expect(await campana()).toHaveFocus();
            expect(await campana()).toHaveAttribute("aria-expanded", "false");
        });

        it("salir tabulando lo cierra; pulsar en un hueco del panel, no", async () => {
            const user = userEvent.setup();
            renderWithProviders(
                <>
                    <CampanaDeAvisos />
                    <button type="button">Lo siguiente</button>
                </>,
            );
            const panel = await abrir(user);
            await within(panel).findByRole("link", { name: /Stock bajo/ });

            await user.click(within(panel).getByRole("heading", { name: "Avisos" }));
            expect(screen.getByRole("dialog")).toBeInTheDocument();

            // Marcar todos, tres enlaces, y fuera.
            await user.tab();
            await user.tab();
            await user.tab();
            await user.tab();
            await user.tab();

            expect(screen.getByRole("button", { name: "Lo siguiente" })).toHaveFocus();
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("sin avisos lo dice, y no ofrece marcar nada", async () => {
            servidorCon([]);
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);

            const panel = await abrir(user);

            expect(await within(panel).findByText("No tienes avisos.")).toBeInTheDocument();
            expect(within(panel).getByRole("button", { name: "Marcar todos como leídos" })).toBeDisabled();
        });

        it("si la lista no carga, lo dice en vez de quedarse girando", async () => {
            api.getAll.mockRejectedValue(new Error("sin red"));
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);

            const panel = await abrir(user);

            expect(await within(panel).findByText("No se pudieron cargar los avisos.")).toBeInTheDocument();
        });
    });

    describe("Marcar como leído", () => {
        it("pulsar un aviso sin leer lo marca, cierra el panel y baja el número", async () => {
            api.markRead.mockResolvedValue({ unread: 1 });
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);
            const panel = await abrir(user);

            await user.click(await within(panel).findByRole("link", { name: /Stock bajo/ }));

            expect(api.markRead).toHaveBeenCalledTimes(1);
            expect(api.markRead.mock.calls[0]![0]).toBe("a1");
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            expect(await campana("Avisos: 1 sin leer")).toBeInTheDocument();
            expect(screen.getByText("Tienes 1 aviso sin leer")).toBeInTheDocument();
        });

        it("pulsar uno ya leído lleva a su sitio sin volver a marcarlo", async () => {
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);
            const panel = await abrir(user);

            await user.click(await within(panel).findByRole("link", { name: /^La compra/ }));

            expect(api.markRead).not.toHaveBeenCalled();
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("marcar todos quita el número y los «sin leer» sin cerrar el panel", async () => {
            api.markAllRead.mockResolvedValue({ unread: 0 });
            const user = userEvent.setup();
            renderWithProviders(<CampanaDeAvisos />);
            const panel = await abrir(user);
            await within(panel).findByRole("link", { name: /^Sin leer: Stock bajo/ });

            await user.click(within(panel).getByRole("button", { name: "Marcar todos como leídos" }));

            await waitFor(() => expect(within(panel).queryByText("Sin leer:")).not.toBeInTheDocument());
            expect(api.markAllRead).toHaveBeenCalledTimes(1);
            expect(within(panel).getAllByRole("link")).toHaveLength(3);
            expect(within(panel).getByRole("button", { name: "Marcar todos como leídos" })).toBeDisabled();
            expect(await campana("Avisos")).toBeInTheDocument();
        });
    });
});

describe("haceCuanto (T5-12)", () => {
    const AHORA = Date.parse("2026-10-01T12:00:00Z");
    const hace = (segundos: number) => new Date(AHORA - segundos * 1000).toISOString();

    it.each([
        [20, "ahora", "now"],
        [5 * 60, "hace 5 minutos", "5 minutes ago"],
        [3 * 3600, "hace 3 horas", "3 hours ago"],
        [26 * 3600, "ayer", "yesterday"],
        [3 * 86_400, "hace 3 días", "3 days ago"],
    ])("%i segundos atrás", (segundos, es, en) => {
        expect(haceCuanto("es", hace(segundos), AHORA)).toBe(es);
        expect(haceCuanto("en", hace(segundos), AHORA)).toBe(en);
    });

    it("a partir de una semana da la fecha", () => {
        expect(haceCuanto("es", "2026-09-10T12:00:00Z", AHORA)).toBe("10 sep 2026");
    });

    it("una fecha del futuro —relojes desajustados— no cuenta hacia delante", () => {
        expect(haceCuanto("es", hace(-120), AHORA)).toBe("ahora");
    });
});
