import { screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { renderWithProviders } from "@/tests/utils";
import { ErrorDeCarga } from "@/shared/components/ErrorDeCarga";

/**
 * AUD-008, crítica del 2026-11-06 — el aviso de una carga fallida habla para quien usa la
 * pantalla. Un fallo del servidor o una ruta que no existe no se los puede arreglar él, y su
 * texto era técnico («Ruta no encontrada: GET /api/v1/…»).
 */
function errorHttp(status: number, cuerpo: unknown) {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError("fallo", String(status), config, {}, { status, statusText: "", headers: {}, config, data: cuerpo });
}

describe("ErrorDeCarga", () => {
    it("ante una ruta que no existe no enseña el texto técnico", () => {
        const error = errorHttp(404, { code: "ROUTE_NOT_FOUND", message: "Ruta no encontrada", params: { metodo: "GET", ruta: "/api/v1/reports" } });
        renderWithProviders(<ErrorDeCarga titulo="No se pudo cargar" error={error} onReintentar={() => {}} />);

        expect(screen.getByRole("alert")).toHaveTextContent("El servidor no respondió como debía");
        expect(screen.getByRole("alert")).not.toHaveTextContent("/api/v1");
    });

    it("ante un fallo del servidor, tampoco", () => {
        renderWithProviders(<ErrorDeCarga titulo="No se pudo cargar" error={errorHttp(500, {})} onReintentar={() => {}} />);

        expect(screen.getByRole("alert")).toHaveTextContent("Suele resolverse al reintentar");
    });

    it("lo que sí le dice algo —sin permiso— se queda", () => {
        const error = errorHttp(403, { code: "FORBIDDEN", message: "Prohibido" });
        renderWithProviders(<ErrorDeCarga titulo="No se pudo cargar" error={error} onReintentar={() => {}} />);

        expect(screen.getByRole("alert")).not.toHaveTextContent("El servidor no respondió como debía");
    });
});
