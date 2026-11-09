import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/tests/utils";
import { useAtencionDeHoy } from "@/modules/dashboard/hooks/useAtencionDeHoy";
import { getAttention } from "@/modules/reports/api/reports.api";
import { queryClient } from "@/shared/lib/queryClient";
import { queryKeys } from "@/shared/constants/queryKeys";
import type { AtencionDeHoy } from "@/modules/reports/types/reports.types";

/**
 * AUD-010 — «Necesita atención» en una sola petición (`GET /reports/attention`). Antes eran
 * cinco o seis, una por cifra, contra el límite global de la API.
 */

vi.mock("@/modules/reports/api/reports.api", () => ({ getAttention: vi.fn() }));

const ATENCION: AtencionDeHoy = {
    lowStock: { total: 4, products: [{ id: "p1", name: "RAM", sku: null, stock: 0, minStock: 5, category: null }] },
    expiring: { days: 30, total: 3, expiredCount: 1, first: { code: "L-1", productName: "Yogur", expiresAt: "2026-11-01", expired: true } },
    openCounts: 1,
    purchasesToReceive: 5,
    pendingSales: 2,
};

function envoltorio() {
    const cliente = createTestQueryClient();
    return ({ children }: { children: ReactNode }) => <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

// Con llaves: devolver el mock lo convertiría en la limpieza del test, y vitest lo llamaría.
beforeEach(() => {
    vi.mocked(getAttention).mockReset();
});

describe("useAtencionDeHoy (AUD-010)", () => {
    it("todas las filas salen de una sola petición", async () => {
        vi.mocked(getAttention).mockResolvedValue(ATENCION);
        const { result } = renderHook(() => useAtencionDeHoy(["stock", "caducidades", "conteos", "compras", "ventas"]), { wrapper: envoltorio() });

        await waitFor(() => expect(result.current.stock.valor).toBe(4));
        expect(getAttention).toHaveBeenCalledTimes(1);
        expect(result.current.lowStockProducts).toEqual(ATENCION.lowStock.products);
        expect(result.current.caducidades.valor).toBe(3);
        expect(result.current.lotesCaducados).toBe(1);
        expect(result.current.diasDeCaducidad).toBe(30);
        expect(result.current.primerLote).toMatchObject({ code: "L-1", expired: true });
        expect(result.current.conteos.valor).toBe(1);
        expect(result.current.compras.valor).toBe(5);
        expect(result.current.ventas.valor).toBe(2);
    });

    it("si falla, cada fila dice «no disponible» en vez de inventar un cero", async () => {
        vi.mocked(getAttention).mockImplementation(() => Promise.reject(new Error("Network Error")));
        const { result } = renderHook(() => useAtencionDeHoy(["stock", "ventas"]), { wrapper: envoltorio() });

        await waitFor(() => expect(result.current.ventas.error).toBe(true));
        expect(result.current.ventas.valor).toBeNull();
        expect(result.current.stock.valor).toBeNull();
        expect(result.current.lowStockProducts).toEqual([]);
    });

    it("sin filas que enseñar (SELLER) no pide nada", () => {
        renderHook(() => useAtencionDeHoy([]), { wrapper: envoltorio() });
        expect(getAttention).not.toHaveBeenCalled();
    });
});

describe("queryClient (AUD-010)", () => {
    it("cualquier mutación que sale bien deja vieja «Necesita atención»", async () => {
        const invalidar = vi.spyOn(queryClient, "invalidateQueries");
        const mutacion = queryClient.getMutationCache().build(queryClient, { mutationFn: async () => "hecho" });

        await mutacion.execute(undefined);

        expect(invalidar).toHaveBeenCalledWith({ queryKey: queryKeys.atencion });
        invalidar.mockRestore();
    });
});
