import { act, renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useShipSaleOrder, useUpdateSaleOrder } from "@/modules/sale-orders/hooks/useSaleOrders";
import { shipSaleOrder, updateSaleOrder } from "@/modules/sale-orders/api/sale-orders.api";
import { createTestQueryClient } from "@/tests/utils";

/**
 * AUD-005 — el servidor bloquea la orden y rechaza la transición que ya no cabe: casi siempre,
 * porque otra persona la envió o la canceló entretanto. Lo que tiene que hacer la pantalla es
 * dejar de enseñar el estado viejo, o se puede volver a pulsar lo mismo.
 */

const rechazo = Object.assign(new Error("409"), {
    isAxiosError: true,
    response: { status: 409, data: { code: "INVALID_STATUS_TRANSITION" } },
});

vi.mock("@/modules/sale-orders/api/sale-orders.api", () => ({
    updateSaleOrder: vi.fn(),
    shipSaleOrder: vi.fn(),
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function montar<T>(hook: () => T) {
    const client = createTestQueryClient();
    const invalidadas = vi.spyOn(client, "invalidateQueries");
    const envoltorio = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(hook, { wrapper: envoltorio });
    const claves = () => invalidadas.mock.calls.map(([filtro]) => filtro?.queryKey);
    return { result, claves };
}

beforeEach(() => vi.clearAllMocks());

describe("Un cambio de estado rechazado vuelve a pedir las ventas (AUD-005)", () => {
    it("al fallar un PATCH, la lista se refresca", async () => {
        vi.mocked(updateSaleOrder).mockRejectedValue(rechazo);
        const { result, claves } = montar(() => useUpdateSaleOrder());

        await act(() => result.current.mutateAsync({ id: "v-1", dto: { status: "CANCELLED" } }).catch(() => undefined));

        expect(claves()).toContainEqual(["sale-orders"]);
    });

    it("al fallar un envío, también", async () => {
        vi.mocked(shipSaleOrder).mockRejectedValue(rechazo);
        const { result, claves } = montar(() => useShipSaleOrder());

        await act(() => result.current.mutateAsync("v-1").catch(() => undefined));

        expect(claves()).toContainEqual(["sale-orders"]);
    });
});
