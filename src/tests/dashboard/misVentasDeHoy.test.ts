import { renderHook } from "@testing-library/react";
import { diaDeHoy, useMisVentasDeHoy } from "@/modules/dashboard/hooks/useMisVentasDeHoy";

// El listado no filtra por autor: lo hace el hook. Se sustituye la consulta por una lista fija
// del día con ventas de dos personas, una cancelada y otra sin autor.
const consultaPedida: unknown[] = [];
vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: (query: unknown, opciones: unknown) => {
        consultaPedida.push(query, opciones);
        return {
            isLoading: false,
            isError: false,
            data: {
                data: [
                    { id: "1", status: "SHIPPED", total: "100.50", createdByEmail: "Vende@Stockly.app" },
                    { id: "2", status: "CANCELLED", total: "40.00", createdByEmail: "vende@stockly.app" },
                    { id: "3", status: "SHIPPED", total: "999.00", createdByEmail: "otra@stockly.app" },
                    { id: "4", status: "SHIPPED", total: "5.00", createdByEmail: null },
                    { id: "5", status: "PENDING", total: "10.00", createdByEmail: "vende@stockly.app" },
                ],
                meta: { total: 5, page: 1, limit: 100, totalPages: 1 },
            },
        };
    },
}));

describe("useMisVentasDeHoy", () => {
    beforeEach(() => {
        consultaPedida.length = 0;
    });

    it("se queda con las de quien está en sesión, sin distinguir mayúsculas", () => {
        const { result } = renderHook(() => useMisVentasDeHoy("vende@stockly.app"));

        expect(result.current.ventas.map((v) => v.id)).toEqual(["1", "2", "5"]);
    });

    it("las canceladas se listan pero no cuentan ni suman: no se cobraron", () => {
        const { result } = renderHook(() => useMisVentasDeHoy("vende@stockly.app"));

        expect(result.current.cantidad).toBe(2);
        expect(result.current.importe).toBeCloseTo(110.5);
    });

    it("pide solo el día de hoy, y nada si no hay correo", () => {
        renderHook(() => useMisVentasDeHoy(undefined));

        const hoy = diaDeHoy();
        expect(consultaPedida[0]).toMatchObject({ from: hoy, to: hoy });
        expect(consultaPedida[1]).toMatchObject({ enabled: false });
    });

    it("el día es el del reloj local, con ceros a la izquierda", () => {
        expect(diaDeHoy(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    });
});
