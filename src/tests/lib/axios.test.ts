import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

vi.mock("react-toastify", () => ({
    toast: { warn: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import api from "@/shared/api/axios";
import { toast } from "react-toastify";

type Handler = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

function setAdapter(handler: Handler) {
    api.defaults.adapter = (config) => handler(config as InternalAxiosRequestConfig);
}

function ok(config: InternalAxiosRequestConfig, data: unknown = {}): AxiosResponse {
    return { data, status: 200, statusText: "OK", headers: {}, config };
}

function fail(config: InternalAxiosRequestConfig, status: number): never {
    const response = { data: {}, status, statusText: "", headers: {}, config } as AxiosResponse;
    throw new AxiosError("error", "ERR", config, {}, response);
}

const originalLocation = window.location;

function stubLocation(pathname = "/dashboard") {
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { pathname, replace, assign: vi.fn(), href: "http://localhost/" },
    });
    return replace;
}

describe("interceptor de axios", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.cookie = "csrfToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    });

    afterEach(() => {
        Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    });

    it("añade la cabecera x-csrf-token en peticiones que mutan estado", async () => {
        document.cookie = "csrfToken=abc123";
        let captured: InternalAxiosRequestConfig | undefined;
        setAdapter((config) => {
            captured = config;
            return Promise.resolve(ok(config));
        });

        await api.post("/products", { name: "X" });

        expect(captured?.headers.get("x-csrf-token")).toBe("abc123");
    });

    it("NO añade la cabecera CSRF en peticiones GET (método seguro)", async () => {
        document.cookie = "csrfToken=abc123";
        let captured: InternalAxiosRequestConfig | undefined;
        setAdapter((config) => {
            captured = config;
            return Promise.resolve(ok(config));
        });

        await api.get("/products");

        expect(captured?.headers.get("x-csrf-token")).toBeFalsy();
    });

    it("muestra un toast de advertencia ante un 429", async () => {
        stubLocation();
        setAdapter((config) => Promise.reject(fail(config, 429)));

        await expect(api.get("/products")).rejects.toBeTruthy();
        expect(toast.warn).toHaveBeenCalledWith(
            expect.stringMatching(/Demasiadas solicitudes/i),
            expect.objectContaining({ toastId: "rate-limit" }),
        );
    });

    it("ante un 401 renueva el token y reintenta la petición original", async () => {
        stubLocation();
        let refreshCalled = false;
        setAdapter((config) => {
            if (config.url?.includes("/auth/refresh")) {
                refreshCalled = true;
                return Promise.resolve(ok(config, { message: "renovado" }));
            }
            // Primera vez 401; el reintento (con _retry) devuelve 200.
            if (config._retry) return Promise.resolve(ok(config, { ok: true }));
            return Promise.reject(fail(config, 401));
        });

        const res = await api.get("/protected");

        expect(refreshCalled).toBe(true);
        expect(res.status).toBe(200);
        expect(res.data).toEqual({ ok: true });
    });

    it("si el refresh también falla, redirige a /auth/login", async () => {
        const replace = stubLocation("/dashboard");
        setAdapter((config) => {
            if (config.url?.includes("/auth/refresh")) return Promise.reject(fail(config, 401));
            return Promise.reject(fail(config, 401));
        });

        await expect(api.get("/protected")).rejects.toBeTruthy();
        expect(replace).toHaveBeenCalledWith("/auth/login");
    });
});
