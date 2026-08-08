import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import PurchaseOrdersPage from "@/modules/purchase-orders/components/PurchaseOrdersPage";
import type { PurchaseOrderQuery } from "@/modules/purchase-orders/types/purchase-orders.types";

// T2-04: el endpoint pasó a responder `{ data, meta }` (T2-03) y la página tiene que
// consumir esa forma y ofrecer controles para moverse entre páginas.

const TOTAL = 23;

function ordenesDe(page: number, limit: number) {
    const desde = (page - 1) * limit;
    return Array.from({ length: Math.min(limit, TOTAL - desde) }, (_, i) => ({
        id: `orden-${desde + i}`,
        supplierId: null,
        supplier: null,
        status: "PENDING" as const,
        notes: null,
        items: [],
        createdAt: "2026-08-07T10:00:00.000Z",
        updatedAt: "2026-08-07T10:00:00.000Z",
    }));
}

// Registra con qué parámetros se pidió cada consulta, para comprobar que la página
// realmente pide otra página en vez de recortar en cliente.
const consultas: PurchaseOrderQuery[] = [];

vi.mock("@/modules/purchase-orders/hooks/usePurchaseOrders", () => ({
    usePurchaseOrders: (params?: PurchaseOrderQuery) => {
        consultas.push(params ?? {});
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 10;
        return {
            data: {
                data: ordenesDe(page, limit),
                meta: { total: TOTAL, page, limit, totalPages: Math.ceil(TOTAL / limit) },
            },
            isLoading: false,
        };
    },
    useCreatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useUpdatePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
    useDeletePurchaseOrder: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/modules/auth/hooks/useAuth", () => ({
    useAuth: () => ({ user: { id: "u1", name: "Admin", role: "ADMIN" } }),
}));

vi.mock("@/modules/suppliers/hooks/useSuppliers", () => ({
    useSuppliers: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/modules/products/hooks/useProducts", () => ({
    useProducts: () => ({ data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } } }),
}));

describe("PurchaseOrdersPage — paginación (T2-04)", () => {
    beforeEach(() => {
        consultas.length = 0;
    });

    it("muestra el total del servidor, no el número de filas de la página", () => {
        renderWithProviders(<PurchaseOrdersPage />);

        // El texto se parte en varios nodos (`{total} orden{…} en total`), así que se
        // compara el contenido completo del párrafo.
        expect(
            screen.getByText((_, el) => el?.textContent === `${TOTAL} órdenes en total`),
        ).toBeInTheDocument();
        expect(screen.getAllByText(/^Orden #/)).toHaveLength(10);
    });

    it("muestra los controles con la página actual y el total de páginas", () => {
        renderWithProviders(<PurchaseOrdersPage />);

        expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled();
    });

    it("«Siguiente» pide la página 2 al servidor", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(screen.getByRole("button", { name: "Siguiente" }));

        expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
        expect(consultas.at(-1)).toEqual({ page: 2, limit: 10 });
        expect(screen.getByRole("button", { name: "Anterior" })).toBeEnabled();
    });

    it("la última página desactiva «Siguiente» y muestra solo el resto", async () => {
        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrdersPage />);

        await user.click(screen.getByRole("button", { name: "Siguiente" }));
        await user.click(screen.getByRole("button", { name: "Siguiente" }));

        expect(screen.getByText("Página 3 de 3")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Siguiente" })).toBeDisabled();
        expect(screen.getAllByText(/^Orden #/)).toHaveLength(TOTAL - 20);
    });
});
