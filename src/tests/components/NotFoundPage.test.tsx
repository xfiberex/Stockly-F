import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/utils";
import NotFoundPage from "@/shared/components/NotFoundPage";

describe("NotFoundPage (AUD-019)", () => {
    it("fuera de la aplicación pone su propio <main> y la marca", () => {
        renderWithProviders(<NotFoundPage />);

        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByText("Stockly")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeInTheDocument();
    });

    it("dentro de la aplicación no anida un segundo <main> ni repite la marca", () => {
        // El `<main>` es el de `App.tsx`: aquí se simula para comprobar que no queda otro dentro.
        renderWithProviders(<main><NotFoundPage dentroDeLaApp /></main>);

        expect(screen.getAllByRole("main")).toHaveLength(1);
        expect(screen.queryByText("Stockly")).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 1, name: "Página no encontrada" })).toBeInTheDocument();
    });

    it.each([false, true])("lleva al inicio y no promete el «Dashboard» (dentro de la app: %s)", (dentroDeLaApp) => {
        renderWithProviders(<NotFoundPage dentroDeLaApp={dentroDeLaApp} />);

        expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
        expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
    });
});
