import { useEffect } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { fijarSimboloDeMoneda, formatearImporte, simboloDeMoneda } from "@/shared/lib/moneda";
import { NEGOCIO_KEY } from "@/modules/settings/hooks/useNegocio";
import { SETTINGS_KEY } from "@/modules/settings/hooks/useSettings";
import { getNegocio } from "@/modules/settings/api/settings.api";
import type { Negocio } from "@/shared/contratos";
import { createTestQueryClient } from "../utils";

/**
 * T6-03 — la moneda del negocio llega a la interfaz **antes del primer importe**.
 *
 * `formatearImporte` es una función pura que llaman doce componentes, así que el símbolo no
 * puede viajar por un hook. Lo que se prueba aquí es el mecanismo entero, con el
 * `ProtectedRoute` y el `useNegocio` de verdad y solo la petición sustituida: ninguna pantalla
 * se pinta con el símbolo anterior, ni al entrar ni cuando un administrador lo cambia.
 */

vi.mock("@/modules/auth/hooks/useMe", () => ({
    useAuth: () => ({ user: { id: "1", role: "USER" }, isLoading: false, isError: false }),
}));
vi.mock("@/modules/settings/api/settings.api", () => ({
    getNegocio: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    subirLogo: vi.fn(),
    quitarLogo: vi.fn(),
}));

const pedir = vi.mocked(getNegocio);

const negocio = (currencySymbol: string): Negocio => ({
    name: "", taxId: "", address: "", phone: "", email: "", currencySymbol, taxName: "", taxRate: 0, logoUrl: null,
});

/** Todo lo que la «pantalla» ha llegado a pintar, y cuántas veces se ha montado. */
let pintado: string[];
let montajes: number;

function Pantalla() {
    const importe = formatearImporte(1500);
    pintado.push(importe);
    useEffect(() => {
        montajes++;
    }, []);
    return <p>{importe}</p>;
}

function montar(cliente: QueryClient = createTestQueryClient()) {
    render(
        <QueryClientProvider client={cliente}>
            <MemoryRouter>
                <ProtectedRoute>
                    <Pantalla />
                </ProtectedRoute>
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return cliente;
}

describe("La moneda del negocio en la interfaz (T6-03)", () => {
    beforeEach(() => {
        pintado = [];
        montajes = 0;
        pedir.mockReset();
        act(() => fijarSimboloDeMoneda("$"));
    });

    it("la pantalla no se pinta hasta saber la moneda: su primer importe ya sale en RD$", async () => {
        let entregar!: (n: Negocio) => void;
        pedir.mockReturnValue(new Promise((resolver) => { entregar = resolver; }));

        montar();

        // Con la petición en vuelo no hay pantalla: ni con `$` ni con nada.
        expect(screen.queryByText(/1,500\.00/)).not.toBeInTheDocument();
        expect(pintado).toEqual([]);

        await act(async () => entregar(negocio("RD$")));

        expect(await screen.findByText("RD$1,500.00")).toBeInTheDocument();
        expect(pintado.every((importe) => importe === "RD$1,500.00")).toBe(true);
    });

    it("sin moneda configurada, todo sale en `$`, como antes", async () => {
        pedir.mockResolvedValue(negocio("$"));

        montar();

        expect(await screen.findByText("$1,500.00")).toBeInTheDocument();
    });

    it("si la petición falla, la aplicación no se queda en el spinner: pinta con `$`", async () => {
        pedir.mockRejectedValue(new Error("sin red"));

        montar();

        expect(await screen.findByText("$1,500.00")).toBeInTheDocument();
    });

    it("guardar la configuración vuelve a pedir la moneda, y las pantallas se montan otra vez con la nueva", async () => {
        pedir.mockResolvedValue(negocio("$"));
        const cliente = montar();
        expect(await screen.findByText("$1,500.00")).toBeInTheDocument();
        expect(montajes).toBe(1);

        // Lo que hace `useUpdateSettings` al guardar: invalidar la clave de los ajustes. La
        // del negocio cuelga de ella.
        pedir.mockResolvedValue(negocio("RD$"));
        await act(() => cliente.invalidateQueries({ queryKey: SETTINGS_KEY }));

        expect(await screen.findByText("RD$1,500.00")).toBeInTheDocument();
        expect(screen.queryByText("$1,500.00")).not.toBeInTheDocument();
        // `formatearImporte` es pura: sin montar de nuevo, una pantalla memorizada se
        // quedaría con el símbolo que leyó la primera vez.
        expect(montajes).toBe(2);
    });

    it("volver a pedirla sin que cambie no vuelve a montar nada", async () => {
        pedir.mockResolvedValue(negocio("RD$"));
        const cliente = montar();
        expect(await screen.findByText("RD$1,500.00")).toBeInTheDocument();

        await act(() => cliente.invalidateQueries({ queryKey: NEGOCIO_KEY }));
        await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));

        expect(montajes).toBe(1);
    });

    it("un símbolo que no pasa la regla del contrato no llega a la pantalla", async () => {
        // No puede venir del servidor, que lo valida al guardar y al leer; es la última red.
        pedir.mockResolvedValue(negocio("<b>"));

        montar();

        expect(await screen.findByText("$1,500.00")).toBeInTheDocument();
        expect(simboloDeMoneda()).toBe("$");
    });
});
