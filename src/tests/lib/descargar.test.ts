import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

vi.mock("react-toastify", () => ({
    toast: { warn: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

const guardados: Array<{ blob: Blob; nombre: string }> = [];
vi.mock("@/shared/lib/descarga", () => ({
    downloadBlob: (blob: Blob, nombre: string) => guardados.push({ blob, nombre }),
}));

import api from "@/shared/api/axios";
import { descargarDeLaApi } from "@/shared/api/descargar";
import { toast } from "react-toastify";

/**
 * Las descargas de la API van por axios y no por un enlace (T2-34, extendido el 2026-09-29).
 *
 * Con un enlace, un `VITE_API_URL` absoluto deja la API en otro origen y el navegador ignora
 * `download`: el E2E del CSV de T5-09 esperaba una descarga que no llegaba.
 */

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function setAdapter(handler: Handler) {
    api.defaults.adapter = (config) => handler(config as InternalAxiosRequestConfig);
}

function falla(config: InternalAxiosRequestConfig, status: number, data: unknown): never {
    const response = { data, status, statusText: "", headers: {}, config } as AxiosResponse;
    throw new AxiosError("error", "ERR", config, {}, response);
}

const originalLocation = window.location;

describe("descargarDeLaApi", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        guardados.length = 0;
    });

    afterEach(() => {
        Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    });

    it("pide la ruta como blob, con sus parámetros, y guarda los bytes tal cual con el nombre dado", async () => {
        let pedida: InternalAxiosRequestConfig | undefined;
        const csv = new Blob(["﻿sku,name"], { type: "text/csv" });
        setAdapter((config) => {
            pedida = config;
            return Promise.resolve({ data: csv, status: 200, statusText: "OK", headers: {}, config });
        });

        await descargarDeLaApi("/reports/period", { from: "2026-03-01", to: "2026-03-31", format: "csv" }, "informe.csv");

        expect(pedida?.url).toBe("/reports/period");
        expect(pedida?.params).toEqual({ from: "2026-03-01", to: "2026-03-31", format: "csv" });
        expect(pedida?.responseType).toBe("blob");
        expect(guardados).toEqual([{ blob: csv, nombre: "informe.csv" }]);
        expect(toast.error).not.toHaveBeenCalled();
    });

    it("un error llega como blob: se lee su código y se avisa traducido, sin guardar nada", async () => {
        const cuerpo = { success: false, message: "x", code: "EXPORT_TOO_LARGE", params: { filas: 60000, maximo: 50000 } };
        setAdapter((config) => falla(config, 413, new Blob([JSON.stringify(cuerpo)], { type: "application/json" })));

        await descargarDeLaApi("/sale-orders/export", { format: "csv" }, "ventas.csv");

        expect(guardados).toEqual([]);
        expect(toast.error).toHaveBeenCalledWith(
            "La exportación tiene 60000 filas y el máximo es 50000. Filtra antes de exportar.",
        );
    });

    it("con la sesión perdida no guarda el JSON del 401 ni avisa: el interceptor ya lleva al login", async () => {
        const replace = vi.fn();
        Object.defineProperty(window, "location", {
            configurable: true,
            value: { pathname: "/reports", replace, assign: vi.fn(), href: "http://localhost/reports" },
        });
        setAdapter((config) => falla(config, 401, new Blob(["{}"], { type: "application/json" })));

        await descargarDeLaApi("/reports", { format: "pdf" }, "reporte.pdf");

        expect(guardados).toEqual([]);
        expect(replace).toHaveBeenCalledWith("/auth/login");
        expect(toast.error).not.toHaveBeenCalled();
    });
});
