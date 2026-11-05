import { renderHook } from "@testing-library/react";
import { diaDeHoy, useMisVentasDeHoy } from "@/modules/dashboard/hooks/useMisVentasDeHoy";

// AUD-008, paso 8 — el servidor filtra por autor (`createdByEmail`); el hook ya no. Antes pedía
// las cien primeras del día de todos y se quedaba con las suyas: un día de más de cien ventas
// entre todos dejaba el resumen corto sin avisar. La consulta se sustituye por una respuesta fija.
const consultaPedida: unknown[] = [];
let respuesta = {
    data: [
        { id: "1", status: "SHIPPED", total: "100.50", createdByEmail: "vende@stockly.app" },
        { id: "2", status: "CANCELLED", total: "40.00", createdByEmail: "vende@stockly.app" },
        { id: "5", status: "PENDING", total: "10.00", createdByEmail: "vende@stockly.app" },
    ],
    meta: { total: 3, page: 1, limit: 100, totalPages: 1 },
};
vi.mock("@/modules/sale-orders/hooks/useSaleOrders", () => ({
    useSaleOrders: (query: unknown, opciones: unknown) => {
        consultaPedida.push(query, opciones);
        return { isLoading: false, isError: false, isFetching: false, error: null, errorUpdateCount: 0, data: respuesta };
    },
}));

describe("useMisVentasDeHoy", () => {
    beforeEach(() => {
        consultaPedida.length = 0;
    });

    it("pide al servidor las de quien está en sesión y de hoy", () => {
        renderHook(() => useMisVentasDeHoy("vende@stockly.app"));

        const hoy = diaDeHoy();
        expect(consultaPedida[0]).toMatchObject({ from: hoy, to: hoy, createdByEmail: "vende@stockly.app" });
    });

    it("las canceladas se listan pero no cuentan ni suman: no se cobraron", () => {
        const { result } = renderHook(() => useMisVentasDeHoy("vende@stockly.app"));

        expect(result.current.ventas.map((v) => v.id)).toEqual(["1", "2", "5"]);
        expect(result.current.cantidad).toBe(2);
        expect(result.current.importe).toBeCloseTo(110.5);
        expect(result.current.incompleto).toBe(false);
    });

    it("si hay más de las que caben en una petición, lo dice en vez de sumar de menos", () => {
        respuesta = { ...respuesta, meta: { ...respuesta.meta, total: 140 } };
        const { result } = renderHook(() => useMisVentasDeHoy("vende@stockly.app"));

        expect(result.current.incompleto).toBe(true);
    });

    it("nada si no hay correo", () => {
        renderHook(() => useMisVentasDeHoy(undefined));

        expect(consultaPedida[1]).toMatchObject({ enabled: false });
    });

    it("el día es el del reloj local, con ceros a la izquierda", () => {
        expect(diaDeHoy(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    });
});
